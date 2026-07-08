using DotNetBackend.Dto;
using DotNetBackend.Serialization;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace DotNetBackend.Sapphire;

public class ApiClient(IHttpClientFactory httpClientFactory, IMemoryCache cache, IConfiguration configuration) : IApiClient
{
    private const string RemoteApiBase = "https://autotest.sapphire-solutions.co.uk";
    private const string ApiBase = $"{RemoteApiBase}/API/1";
    private const string EventListBase = $"{RemoteApiBase}/eventlist.php";
    private static readonly Regex SiteNameRegex = new(@"sitename=([^""&]+)", RegexOptions.Compiled);
    private readonly TimeSpan _cacheDuration = TimeSpan.FromSeconds(
        configuration.GetValue<int>("ApiClient:CacheDurationSeconds", 30));
    async Task<LeaderboardDto> IApiClient.GetLeaderboard(int competitionId, int leaderboardId, CancellationToken ct)
    {
        using var client = httpClientFactory.CreateClient();
        var url = LeaderboardsUrl(competitionId, leaderboardId);
        using var resp = await client.GetAsync(url, ct);
        resp.EnsureSuccessStatusCode();
        var bytes = await resp.Content.ReadAsByteArrayAsync(ct);
        var contentType = resp.Content.Headers.ContentType?.ToString() ?? "application/json";
        var cacheKey = $"{nameof(IApiClient.GetLeaderboards)}:{competitionId}:{leaderboardId}";
        cache.Set(cacheKey, (bytes, contentType), _cacheDuration);
        return JsonSerializer.Deserialize(bytes.AsSpan(), AppJsonContext.Default.LeaderboardDto)
            ?? throw new InvalidOperationException($"Empty response from {url}");
    }

    async Task<IResult> IApiClient.GetLeaderboards(int competitionId, int? leaderboardId, CancellationToken ct)
    {
        var cacheKey = $"{nameof(IApiClient.GetLeaderboards)}:{competitionId}:{leaderboardId}";
        if (!cache.TryGetValue(cacheKey, out (byte[] bytes, string contentType) cached))
        {
            using var client = httpClientFactory.CreateClient();
            using var resp = await client.GetAsync(LeaderboardsUrl(competitionId, leaderboardId), ct);
            resp.EnsureSuccessStatusCode();
            cached = (
                await resp.Content.ReadAsByteArrayAsync(ct),
                resp.Content.Headers.ContentType?.ToString() ?? "application/json"
            );
            cache.Set(cacheKey, cached, _cacheDuration);
        }
        return Results.Bytes(cached.bytes, cached.contentType);
    }

    private async Task<(byte[] bytes, string contentType)> GetCompetitionBytesAsync(CancellationToken ct)
    {
        var cacheKey = nameof(IApiClient.GetLiveAllCompetitions);
        if (!cache.TryGetValue(cacheKey, out (byte[] bytes, string contentType) cached))
        {
            using var client = httpClientFactory.CreateClient();
            using var resp = await client.GetAsync(LiveAllCompetitionsUrl(), ct);
            resp.EnsureSuccessStatusCode();
            cached = (
                await resp.Content.ReadAsByteArrayAsync(ct),
                resp.Content.Headers.ContentType?.ToString() ?? "application/json"
            );
            cache.Set(cacheKey, cached, _cacheDuration * 2);
        }
        return cached;
    }

    async Task<IResult> IApiClient.GetLiveAllCompetitions(CancellationToken ct)
    {
        var cached = await GetCompetitionBytesAsync(ct);
        return Results.Bytes(cached.bytes, cached.contentType);
    }

    async Task<IReadOnlyList<CompetitionDto>> IApiClient.GetCompetitions(CancellationToken ct)
    {
        var cached = await GetCompetitionBytesAsync(ct);
        return JsonSerializer.Deserialize(cached.bytes.AsSpan(), AppJsonContext.Default.ListCompetitionDto)
            ?? throw new InvalidOperationException($"Empty response from {LiveAllCompetitionsUrl()}");
    }
    private static string LiveAllCompetitionsUrl() =>
        $"{ApiBase}/LiveAllCompetitions/";

    private static string LeaderboardsUrl(int competitionId, int? leaderboardId) =>
        $"{ApiBase}/Competitions/{competitionId}/Leaderboards/{leaderboardId}";

    private static string EventListUrl(int competitionId) =>
        $"{EventListBase}?event={competitionId}";

    async Task<string> IApiClient.GetSiteName(int competitionId, CancellationToken ct)
    {
        var cacheKey = $"{nameof(IApiClient.GetSiteName)}:{competitionId}";
        if (cache.TryGetValue(cacheKey, out string? cached) && cached is not null)
            return cached;

        using var client = httpClientFactory.CreateClient();
        using var resp = await client.GetAsync(EventListUrl(competitionId), HttpCompletionOption.ResponseHeadersRead, ct);
        resp.EnsureSuccessStatusCode();
        using var stream = await resp.Content.ReadAsStreamAsync(ct);
        using var reader = new StreamReader(stream);
        var buffer = new char[4096];
        var accumulated = string.Empty;
        int read;
        while ((read = await reader.ReadAsync(buffer, ct)) > 0)
        {
            accumulated += new string(buffer, 0, read);
            var match = SiteNameRegex.Match(accumulated);
            if (match.Success)
            {
                cached = match.Groups[1].Value;
                cache.Set(cacheKey, cached, TimeSpan.FromHours(24));
                return cached;
            }
        }

        throw new InvalidOperationException("sitename not found in event list");
    }
}
