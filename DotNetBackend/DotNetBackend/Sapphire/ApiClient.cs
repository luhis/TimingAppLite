using DotNetBackend.Dto;
using System.Text.Json;

namespace DotNetBackend.Sapphire;

public class ApiClient(IHttpClientFactory httpClientFactory) : IApiClient
{
    private const string RemoteApiBase = "https://autotest.sapphire-solutions.co.uk/API/1";
    private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true, Converters = { new ForgivingStringConverter() } };

    Task<LeaderboardDto> IApiClient.GetResults(string competitionId, string leaderboardId) =>
        Fetch<LeaderboardDto>($"{RemoteApiBase}/Competitions/{competitionId}/Leaderboards/{leaderboardId}");

    async Task<IResult> IApiClient.GetLiveAllCompetitions()
    {
        var client = _httpClientFactory.CreateClient();
        var resp = await client.GetAsync($"{RemoteApiBase}/LiveAllCompetitions/");
        resp.EnsureSuccessStatusCode();
        var contentType = resp.Content.Headers.ContentType?.ToString() ?? "application/json";
        var stream = await resp.Content.ReadAsStreamAsync();
        return Results.Stream(stream, contentType);
    }

    private async Task<T> Fetch<T>(string url)
    {
        var client = _httpClientFactory.CreateClient();
        using var resp = await client.GetAsync(url);
        resp.EnsureSuccessStatusCode();
        return await resp.Content.ReadFromJsonAsync<T>(_jsonOptions)
            ?? throw new InvalidOperationException($"Empty response from {url}");
    }

    async Task<IResult> IApiClient.GetLeaderboards(int competionId, int? leaderboardId)
    {
        var client = _httpClientFactory.CreateClient();
        var resp = await client.GetAsync($"{RemoteApiBase}/Competitions/{competionId}/Leaderboards/{leaderboardId}");
        resp.EnsureSuccessStatusCode();
        var contentType = resp.Content.Headers.ContentType?.ToString() ?? "application/json";
        var stream = await resp.Content.ReadAsStreamAsync();
        return Results.Stream(stream, contentType);
    }
}
