using DotNetBackend.Dto;
using DotNetBackend.Hubs;
using DotNetBackend.Sapphire;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace DotNetBackend.Services;

public sealed class LeaderboardService(IApiClient apiClient, IHubContext<LeaderboardHub> hubContext, IConfiguration configuration, ILogger<LeaderboardService> logger)
    : BackgroundService
{
    private readonly TimeSpan _timerInterval = TimeSpan.FromSeconds(
        configuration.GetValue("LeaderboardService:PollIntervalSeconds", 60));
    private readonly bool _optimisePushUpdates =
        configuration.GetValue("LeaderboardService:OptimisePushUpdates", true);

    private readonly ConcurrentDictionary<(int competitionId, int leaderboardId), LeaderboardDto?> _previousResults = new();
    private readonly ConcurrentDictionary<string, (int competitionId, int leaderboardId)> _connectionGroups = new();

    internal IEnumerable<(int competitionId, int leaderboardId)> ActiveGroups =>
        _connectionGroups.Values.Distinct();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(_timerInterval);
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                var competitons = await apiClient.GetCompetitions(stoppingToken);
                foreach (var key in ActiveGroups)
                {
                    var comp = competitons.Single(c => c.Id == key.competitionId.ToString());
                    if (comp.Active == ActiveStatus.Live)
                    {
                        await SafePushChanges(key);
                    }
                    else
                    {
                        await PushCompetitionUpdate(key.competitionId, key.leaderboardId, comp, stoppingToken);
                    }
                }
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            logger.LogCritical(ex, "Leaderboard timer crashed — host will keep running");
        }
    }

    private async Task PushCompetitionUpdate(int competitionId, int leaderboardId, CompetitionDto competition, CancellationToken stoppingToken)
    {
        var groupName = LeaderboardHub.GetCompetitionGroup(competitionId, leaderboardId);
        await hubContext.Clients.Group(groupName)
            .SendAsync("ReceiveCompetitionUpdate", competition, stoppingToken);
    }

    private async Task SafePushChanges((int competitionId, int leaderboardId) key)
    {
        try
        {
            await PushChanges(key);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "PushChanges failed for {CompetitionId}/{LeaderboardId}", key.competitionId, key.leaderboardId);
        }
    }

    public void Subscribe(string connectionId, (int competitionId, int leaderboardId) key) =>
        _connectionGroups[connectionId] = key;

    public void Unsubscribe(string connectionId, (int competitionId, int leaderboardId) key)
    {
        if (!_connectionGroups.TryRemove(connectionId, out var removed) || removed != key) return;

        if (!ActiveGroups.Contains(key))
            _previousResults.TryRemove(key, out _);
    }

    public void RemoveAllSubscriptions(string connectionId)
    {
        if (_connectionGroups.TryRemove(connectionId, out var key))
            if (!ActiveGroups.Contains(key))
                _previousResults.TryRemove(key, out _);
    }

    internal async Task PushChanges((int competitionId, int leaderboardId) key)
    {
        logger.LogInformation("{Method} {CompetitionId}, {LeaderboardId}", nameof(PushChanges), key.competitionId, key.leaderboardId);
        var values = await apiClient.GetLeaderboard(key.competitionId, key.leaderboardId, CancellationToken.None);

        for (var i = 0; i < values.Items.Count; i++)
            values.Items[i]["_index"] = i.ToString();

        var prevSnapshot = _previousResults.GetValueOrDefault(key);
        _previousResults[key] = values;

        var groupName = LeaderboardHub.GetCompetitionGroup(key.competitionId, key.leaderboardId);

        if (!_optimisePushUpdates || prevSnapshot is null)
        {
            await hubContext.Clients.Group(groupName)
                .SendAsync("ReceiveRowUpdate", values.Items, CancellationToken.None);
        }
        else
        {
            var prevByEntry = prevSnapshot.Items
                .Where(r => r.ContainsKey("entry"))
                .ToDictionary(r => r["entry"]);

            var changedRows = values.Items
                .Where(row => row.ContainsKey("entry")
                    && (!prevByEntry.TryGetValue(row["entry"], out var prev)
                        || !RowsEqual(row, prev)))
                .ToList();

            if (changedRows.Count > 0)
            {
                logger.LogInformation("Result changes detected, updating. Comp: {competitionId} board: {leaderboardId} count: {Count}", key.competitionId, key.leaderboardId, changedRows.Count);
                await hubContext.Clients.Group(groupName)
                    .SendAsync("ReceiveRowUpdate", changedRows, CancellationToken.None);

            }
            else
            {
                logger.LogInformation("No result changes detected. Comp: {competitionId} board: {leaderboardId}", key.competitionId, key.leaderboardId);
            }
        }

        if (!_optimisePushUpdates || (prevSnapshot is not null && prevSnapshot.Columns.Count != values.Columns.Count))
        {
            logger.LogInformation("Columns have changed, updating. Comp: {competitionId} board: {leaderboardId} count: {Count}", key.competitionId, key.leaderboardId, values.Columns.Count);
            await hubContext.Clients.Group(groupName)
                .SendAsync("ReceiveColumnUpdate", values.Columns, CancellationToken.None);
        }
    }

    private static bool RowsEqual(Dictionary<string, string> x, Dictionary<string, string> y)
    {
        if (x.Count != y.Count) return false;
        foreach (var (k, v) in x)
            if (!y.TryGetValue(k, out var yv) || v != yv) return false;
        return true;
    }
}
