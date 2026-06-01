using DotNetBackend.Dto;
using System.Text.Json;

namespace DotNetBackend.Sapphire;

public class ApiClient(IHttpClientFactory httpClientFactory) : IApiClient
{
    private const string RemoteApiBase = "https://autotest.sapphire-solutions.co.uk/API/1";
    private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true, Converters = { new ForgivingStringConverter() } };

    async Task<LeaderboardDto> IApiClient.GetResults(string competitionId, string leaderboardId)
    {
        var client = _httpClientFactory.CreateClient();
        var url = LeaderboardsUrl(competitionId, leaderboardId);
        using var resp = await client.GetAsync(url);
        resp.EnsureSuccessStatusCode();
        return await resp.Content.ReadFromJsonAsync<LeaderboardDto>(_jsonOptions)
            ?? throw new InvalidOperationException($"Empty response from {url}");
    }

    async Task<IResult> IApiClient.GetLiveAllCompetitions()
    {
        var client = _httpClientFactory.CreateClient();
        var resp = await client.GetAsync(LiveAllCompetitionsUrl());
        resp.EnsureSuccessStatusCode();
        var contentType = resp.Content.Headers.ContentType?.ToString() ?? "application/json";
        var stream = await resp.Content.ReadAsStreamAsync();
        return Results.Stream(stream, contentType);
    }

    private static string LiveAllCompetitionsUrl() =>
        $"{RemoteApiBase}/LiveAllCompetitions/";

    private static string LeaderboardsUrl(string competitionId, string leaderboardId) =>
        $"{RemoteApiBase}/Competitions/{competitionId}/Leaderboards/{leaderboardId}";

    async Task<IResult> IApiClient.GetLeaderboards(int competionId, int? leaderboardId)
    {
        var client = _httpClientFactory.CreateClient();
        var resp = await client.GetAsync(LeaderboardsUrl(competionId.ToString(), leaderboardId.ToString()));
        resp.EnsureSuccessStatusCode();
        var contentType = resp.Content.Headers.ContentType?.ToString() ?? "application/json";
        var stream = await resp.Content.ReadAsStreamAsync();
        return Results.Stream(stream, contentType);
    }
}
