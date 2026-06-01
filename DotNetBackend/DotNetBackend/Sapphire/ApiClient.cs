using DotNetBackend.Dto;
using DotNetBackend.Serialization;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;

namespace DotNetBackend.Sapphire;

public class ApiClient(IHttpClientFactory httpClientFactory, IMemoryCache cache, IConfiguration configuration) : IApiClient
{
    private const string RemoteApiBase = "https://autotest.sapphire-solutions.co.uk/API/1";
    private readonly TimeSpan _cacheDuration = TimeSpan.FromSeconds(
        configuration.GetValue<int>("ApiClient:CacheDurationSeconds", 30));
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new ForgivingDictionaryConverter() },
        TypeInfoResolver = AppJsonContext.Default,
    };

    async Task<LeaderboardDto> IApiClient.GetResults(string competitionId, string leaderboardId)
    {
        var client = httpClientFactory.CreateClient();
        var url = LeaderboardsUrl(competitionId, leaderboardId);
        using var resp = await client.GetAsync(url);
        resp.EnsureSuccessStatusCode();
        return await resp.Content.ReadFromJsonAsync<LeaderboardDto>(_jsonOptions)
            ?? throw new InvalidOperationException($"Empty response from {url}");
    }

    async Task<IResult> IApiClient.GetLiveAllCompetitions(CancellationToken ct)
    {
        var cacheKey = nameof(IApiClient.GetLiveAllCompetitions);
        if (!cache.TryGetValue(cacheKey, out (byte[] bytes, string contentType) cached))
        {
            var client = httpClientFactory.CreateClient();
            var resp = await client.GetAsync(LiveAllCompetitionsUrl(), ct);
            resp.EnsureSuccessStatusCode();
            cached = (
                await resp.Content.ReadAsByteArrayAsync(ct),
                resp.Content.Headers.ContentType?.ToString() ?? "application/json"
            );
            cache.Set(cacheKey, cached, _cacheDuration);
        }
        return Results.Bytes(cached.bytes, cached.contentType);
    }

    async Task<IResult> IApiClient.GetLeaderboards(int competionId, int? leaderboardId, CancellationToken ct)
    {
        var cacheKey = $"{nameof(IApiClient.GetLeaderboards)}:{competionId}:{leaderboardId}";
        if (!cache.TryGetValue(cacheKey, out (byte[] bytes, string contentType) cached))
        {
            var client = httpClientFactory.CreateClient();
            var resp = await client.GetAsync(LeaderboardsUrl(competionId.ToString(), leaderboardId.ToString()), ct);
            resp.EnsureSuccessStatusCode();
            cached = (
                await resp.Content.ReadAsByteArrayAsync(ct),
                resp.Content.Headers.ContentType?.ToString() ?? "application/json"
            );
            cache.Set(cacheKey, cached, _cacheDuration);
        }
        return Results.Bytes(cached.bytes, cached.contentType);
    }

    private static string LiveAllCompetitionsUrl() =>
        $"{RemoteApiBase}/LiveAllCompetitions/";

    private static string LeaderboardsUrl(string competitionId, string leaderboardId) =>
        $"{RemoteApiBase}/Competitions/{competitionId}/Leaderboards/{leaderboardId}";
}
