using DotNetBackend.Dto;
using DotNetBackend.Serialization;
using Microsoft.Extensions.Caching.Memory;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace DotNetBackend.Sapphire;

public partial class ApiClient(IHttpClientFactory httpClientFactory, IMemoryCache cache, IConfiguration configuration) : IApiClient
{
    internal const string RemoteApiBase = "https://cors.io/?u=https://autotest.sapphire-solutions.co.uk";
    private const string ApiBase = $"{RemoteApiBase}/API/1";
    private const string EventListBase = $"{RemoteApiBase}/eventlist.php";
    private const string DefaultJsonContentType = "application/json";
    private static readonly TimeSpan SiteNameCacheDuration = TimeSpan.FromHours(24);

    [GeneratedRegex(@"sitename=([^""&]+)")]
    private static partial Regex SiteNameRegex();

    private readonly TimeSpan _cacheDuration = TimeSpan.FromSeconds(
        configuration.GetValue<int>("ApiClient:CacheDurationSeconds", 30));
    private readonly TimeSpan _staleCacheDuration = TimeSpan.FromSeconds(
        configuration.GetValue<int>("ApiClient:StaleCacheDurationSeconds", 600));
    async Task<LeaderboardDto> IApiClient.GetLeaderboard(int competitionId, int leaderboardId, CancellationToken ct)
    {
        var url = LeaderboardsUrl(competitionId, leaderboardId);
        var (bytes, contentType) = await ExecuteWithUpstreamGateAsync(
            () => FetchBytesAsync(url, HttpCompletionOption.ResponseContentRead, ct),
            ct);

        cache.Set(GetLeaderboardsCacheKey(competitionId, leaderboardId), (bytes, contentType), _cacheDuration);

        return JsonSerializer.Deserialize(bytes.AsSpan(), AppJsonContext.Default.LeaderboardDto)
            ?? throw new InvalidOperationException($"Empty response from {url}");
    }

    async Task<(byte[] Bytes, string ContentType)> IApiClient.GetLeaderboards(int competitionId, int? leaderboardId, CancellationToken ct)
    {
        var cacheKey = GetLeaderboardsCacheKey(competitionId, leaderboardId);
        if (cache.TryGetValue(cacheKey, out (byte[] bytes, string contentType) cached))
        {
            return cached;
        }

        return await ExecuteWithUpstreamGateAsync(async () =>
        {
            if (cache.TryGetValue(cacheKey, out cached))
            {
                return cached;
            }

            cached = await FetchBytesAsync(LeaderboardsUrl(competitionId, leaderboardId), HttpCompletionOption.ResponseContentRead, ct);
            cache.Set(cacheKey, cached, _cacheDuration);
            return cached;
        }, ct);
    }

    private async Task<(byte[] bytes, string contentType)> GetCompetitionBytesAsync(CancellationToken ct)
    {
        var cacheKey = nameof(IApiClient.GetLiveAllCompetitions);
        var staleCacheKey = $"{cacheKey}:stale";
        if (cache.TryGetValue(cacheKey, out (byte[] bytes, string contentType) cached))
        {
            return cached;
        }

        await UpstreamGate.WaitAsync(ct);
        try
        {
            if (cache.TryGetValue(cacheKey, out cached))
            {
                return cached;
            }

            try
            {
                cached = await FetchCompetitionBytesAsync(ct);
                cache.Set(cacheKey, cached, _cacheDuration * 2);
                cache.Set(staleCacheKey, cached, _staleCacheDuration);
                return cached;
            }
            catch (UpstreamHttpException ex) when (ex.StatusCode == HttpStatusCode.TooManyRequests
                && cache.TryGetValue(staleCacheKey, out (byte[] bytes, string contentType) staleCached))
            {
                return staleCached;
            }
        }
        finally
        {
            UpstreamGate.Release();
        }
    }

    private Task<(byte[] bytes, string contentType)> FetchCompetitionBytesAsync(CancellationToken ct) =>
        FetchBytesAsync(LiveAllCompetitionsUrl(), HttpCompletionOption.ResponseContentRead, ct);

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
        {
            return cached;
        }

        var (bytes, _) = await ExecuteWithUpstreamGateAsync(
            () => FetchBytesAsync(EventListUrl(competitionId), HttpCompletionOption.ResponseContentRead, ct),
            ct);
        var match = SiteNameRegex().Match(Encoding.UTF8.GetString(bytes));
        if (match.Success)
        {
            cached = match.Groups[1].Value;
            cache.Set(cacheKey, cached, SiteNameCacheDuration);
            return cached;
        }

        throw new InvalidOperationException("sitename not found in event list");
    }

    // Serialise upstream calls across the singleton so concurrent cache misses don't trigger 429s
    private static readonly SemaphoreSlim UpstreamGate = new(1, 1);

    private const int MaxRetries = 3;
    private static readonly TimeSpan BaseDelay = TimeSpan.FromSeconds(1);
    private static readonly TimeSpan MaxDelay = TimeSpan.FromSeconds(30);

    private static TimeSpan GetRetryDelay(RetryConditionHeaderValue? retryAfter, int attempt)
    {
        var delay = retryAfter?.Delta
            ?? (retryAfter?.Date is { } date ? date - DateTimeOffset.UtcNow : BaseDelay * Math.Pow(2, attempt));
        return delay < TimeSpan.Zero ? TimeSpan.Zero : delay > MaxDelay ? MaxDelay : delay;
    }

    private async Task<(byte[] bytes, string contentType)> FetchBytesAsync(
        string url,
        HttpCompletionOption completionOption,
        CancellationToken ct)
    {
        using var client = httpClientFactory.CreateClient();
        for (var attempt = 0; ; attempt++)
        {
            using var resp = await client.GetAsync(url, completionOption, ct);
            if (resp.StatusCode == HttpStatusCode.TooManyRequests && attempt < MaxRetries)
            {
                var delay = GetRetryDelay(resp.Headers.RetryAfter, attempt);
                resp.Dispose();
                await Task.Delay(delay, ct);
                continue;
            }

            await EnsureSuccessOrThrowUpstreamAsync(resp, ct);
            var responseBytes = await resp.Content.ReadAsByteArrayAsync(ct);
            var proxyResponse = JsonSerializer.Deserialize(responseBytes.AsSpan(), AppJsonContext.Default.ProxyResponse)
                ?? throw new JsonException($"Empty proxy response from {url}");
            if (proxyResponse.Body is null || proxyResponse.Headers is null || proxyResponse.Status is < 100 or > 599)
            {
                throw new JsonException($"Invalid proxy response from {url}");
            }

            var body = Encoding.UTF8.GetBytes(proxyResponse.Body);
            var headers = proxyResponse.Headers.ToDictionary(
                header => header.Key, header => new[] { header.Value }, StringComparer.OrdinalIgnoreCase);
            var contentType = headers.TryGetValue("Content-Type", out var values) ? values[0] : DefaultJsonContentType;
            if (proxyResponse.Status == (int)HttpStatusCode.TooManyRequests && attempt < MaxRetries)
            {
                RetryConditionHeaderValue? retryAfter = null;
                if (headers.TryGetValue("Retry-After", out var retryValues))
                {
                    RetryConditionHeaderValue.TryParse(retryValues[0], out retryAfter);
                }

                var delay = GetRetryDelay(retryAfter, attempt);
                resp.Dispose();
                await Task.Delay(delay, ct);
                continue;
            }

            if (proxyResponse.Status is < 200 or >= 300)
            {
                throw new UpstreamHttpException((HttpStatusCode)proxyResponse.Status, body, contentType, headers);
            }

            return (body, contentType);
        }
    }

    private static string GetLeaderboardsCacheKey(int competitionId, int? leaderboardId) =>
        $"{nameof(IApiClient.GetLeaderboards)}:{competitionId}:{leaderboardId}";

    private static async Task<T> ExecuteWithUpstreamGateAsync<T>(Func<Task<T>> action, CancellationToken ct)
    {
        await UpstreamGate.WaitAsync(ct);
        try
        {
            return await action();
        }
        finally
        {
            UpstreamGate.Release();
        }
    }

    private static async Task EnsureSuccessOrThrowUpstreamAsync(HttpResponseMessage response, CancellationToken ct)
    {
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        var responseBody = await response.Content.ReadAsByteArrayAsync(ct);
        var contentType = response.Content.Headers.ContentType?.ToString() ?? MediaTypeNames.Application.Json;
        var responseHeaders = response.Headers
            .Concat(response.Content.Headers)
            .ToDictionary(h => h.Key, h => h.Value.ToArray(), StringComparer.OrdinalIgnoreCase);
        throw new UpstreamHttpException(response.StatusCode, responseBody, contentType, responseHeaders);
    }
}

public class ProxyResponse
{
    public required string Url { get; init; }
    public int Status { get; init; }
    public required IReadOnlyDictionary<string, string> Headers { get; init; }
    public required string Body { get; init; }
}