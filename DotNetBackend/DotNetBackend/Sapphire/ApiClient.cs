using DotNetBackend.Dto;
using DotNetBackend.Serialization;
using Microsoft.Extensions.Caching.Memory;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace DotNetBackend.Sapphire;

public partial class ApiClient(IHttpClientFactory httpClientFactory, IMemoryCache cache, IConfiguration configuration) : IApiClient
{
    private const string RemoteApiBase = "https://autotest.sapphire-solutions.co.uk";
    private const string ApiBase = $"{RemoteApiBase}/API/1";
    private const string EventListBase = $"{RemoteApiBase}/eventlist.php";

    [GeneratedRegex(@"sitename=([^""&]+)")]
    private static partial Regex SiteNameRegex();

    private readonly TimeSpan _cacheDuration = TimeSpan.FromSeconds(
        configuration.GetValue<int>("ApiClient:CacheDurationSeconds", 30));
    async Task<LeaderboardDto> IApiClient.GetLeaderboard(int competitionId, int leaderboardId, CancellationToken ct)
    {
        using var client = httpClientFactory.CreateClient();
        var url = LeaderboardsUrl(competitionId, leaderboardId);
        byte[] bytes;
        string contentType;
        await UpstreamGate.WaitAsync(ct);
        try
        {
            using var resp = await GetWithBackoffAsync(client, url, HttpCompletionOption.ResponseContentRead, ct);
            await EnsureSuccessOrThrowUpstreamAsync(resp, ct);
            bytes = await resp.Content.ReadAsByteArrayAsync(ct);
            contentType = resp.Content.Headers.ContentType?.ToString() ?? "application/json";
        }
        finally
        {
            UpstreamGate.Release();
        }
        var cacheKey = $"{nameof(IApiClient.GetLeaderboards)}:{competitionId}:{leaderboardId}";
        cache.Set(cacheKey, (bytes, contentType), _cacheDuration);
        return JsonSerializer.Deserialize(bytes.AsSpan(), AppJsonContext.Default.LeaderboardDto)
            ?? throw new InvalidOperationException($"Empty response from {url}");
    }

    async Task<(byte[] Bytes, string ContentType)> IApiClient.GetLeaderboards(int competitionId, int? leaderboardId, CancellationToken ct)
    {
        var cacheKey = $"{nameof(IApiClient.GetLeaderboards)}:{competitionId}:{leaderboardId}";
        if (cache.TryGetValue(cacheKey, out (byte[] bytes, string contentType) cached))
            return cached;

        await UpstreamGate.WaitAsync(ct);
        try
        {
            if (cache.TryGetValue(cacheKey, out cached))
                return cached;
            using var client = httpClientFactory.CreateClient();
            using var resp = await GetWithBackoffAsync(client, LeaderboardsUrl(competitionId, leaderboardId), HttpCompletionOption.ResponseContentRead, ct);
            await EnsureSuccessOrThrowUpstreamAsync(resp, ct);
            cached = (
                await resp.Content.ReadAsByteArrayAsync(ct),
                resp.Content.Headers.ContentType?.ToString() ?? "application/json"
            );
            cache.Set(cacheKey, cached, _cacheDuration);
            return cached;
        }
        finally
        {
            UpstreamGate.Release();
        }
    }

    private async Task<(byte[] bytes, string contentType)> GetCompetitionBytesAsync(CancellationToken ct)
    {
        var cacheKey = nameof(IApiClient.GetLiveAllCompetitions);
        if (cache.TryGetValue(cacheKey, out (byte[] bytes, string contentType) cached))
            return cached;

        await UpstreamGate.WaitAsync(ct);
        try
        {
            if (cache.TryGetValue(cacheKey, out cached))
                return cached;
            cached = await FetchCompetitionBytesAsync(ct);
            cache.Set(cacheKey, cached, _cacheDuration * 2);
            return cached;
        }
        finally
        {
            UpstreamGate.Release();
        }
    }

    private async Task<(byte[] bytes, string contentType)> FetchCompetitionBytesAsync(CancellationToken ct)
    {
        using var client = httpClientFactory.CreateClient();
        using var resp = await GetWithBackoffAsync(client, LiveAllCompetitionsUrl(), HttpCompletionOption.ResponseContentRead, ct);
        await EnsureSuccessOrThrowUpstreamAsync(resp, ct);
        return (
            await resp.Content.ReadAsByteArrayAsync(ct),
            resp.Content.Headers.ContentType?.ToString() ?? "application/json"
        );
    }

    Task<(byte[] Bytes, string ContentType)> IApiClient.GetLiveAllCompetitions(CancellationToken ct)
    {
        return GetCompetitionBytesAsync(ct);
    }

    async Task<IReadOnlyList<CompetitionDto>> IApiClient.GetCompetitions(CancellationToken ct)
    {
        var (bytes, contentType) = await GetCompetitionBytesAsync(ct);
        return JsonSerializer.Deserialize(bytes.AsSpan(), AppJsonContext.Default.ListCompetitionDto)
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
        HttpResponseMessage resp;
        await UpstreamGate.WaitAsync(ct);
        try
        {
            resp = await GetWithBackoffAsync(client, EventListUrl(competitionId), HttpCompletionOption.ResponseHeadersRead, ct);
        }
        finally
        {
            UpstreamGate.Release();
        }
        using var _ = resp;
        await EnsureSuccessOrThrowUpstreamAsync(resp, ct);
        using var stream = await resp.Content.ReadAsStreamAsync(ct);
        using var reader = new StreamReader(stream);
        var buffer = new char[4096];
        var sb = new StringBuilder();
        int read;
        while ((read = await reader.ReadAsync(buffer, ct)) > 0)
        {
            sb.Append(buffer, 0, read);
            var match = SiteNameRegex().Match(sb.ToString());
            if (match.Success)
            {
                cached = match.Groups[1].Value;
                cache.Set(cacheKey, cached, TimeSpan.FromHours(24));
                return cached;
            }
        }

        throw new InvalidOperationException("sitename not found in event list");
    }

    // Serialise upstream calls across the singleton so concurrent cache misses don't trigger 429s
    private static readonly SemaphoreSlim UpstreamGate = new(1, 1);

    private const int MaxRetries = 3;
    private static readonly TimeSpan BaseDelay = TimeSpan.FromSeconds(1);
    private static readonly TimeSpan MaxDelay = TimeSpan.FromSeconds(30);

    private static async Task<HttpResponseMessage> GetWithBackoffAsync(
        HttpClient client, string url, HttpCompletionOption option, CancellationToken ct)
    {
#pragma warning disable IDISP011, IDISP017 // ownership of the final response passes to the caller
        for (var attempt = 0; ; attempt++)
        {
            var resp = await client.GetAsync(url, option, ct);
            if (resp.StatusCode != System.Net.HttpStatusCode.TooManyRequests || attempt >= MaxRetries)
                return resp;

            var retryAfter = resp.Headers.RetryAfter;
            TimeSpan delay = retryAfter?.Delta
                ?? (retryAfter?.Date is { } date ? date - DateTimeOffset.UtcNow : BaseDelay * Math.Pow(2, attempt));
            if (delay < TimeSpan.Zero) delay = TimeSpan.Zero;
            if (delay > MaxDelay) delay = MaxDelay;
            resp.Dispose();
            await Task.Delay(delay, ct);
        }
#pragma warning restore IDISP011, IDISP017
    }

    private static async Task EnsureSuccessOrThrowUpstreamAsync(HttpResponseMessage response, CancellationToken ct)
    {
        if (response.IsSuccessStatusCode)
            return;

        var responseBody = await response.Content.ReadAsByteArrayAsync(ct);
        var contentType = response.Content.Headers.ContentType?.ToString() ?? MediaTypeNames.Application.Json;
        throw new UpstreamHttpException(response.StatusCode, responseBody, contentType);
    }
}
