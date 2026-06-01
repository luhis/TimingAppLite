using DotNetBackend.Dto;
using DotNetBackend.Hubs;
using DotNetBackend.Sapphire;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Collections.Immutable;

namespace DotNetBackend.Services;

public sealed class LeaderboardService(IApiClient apiClient, IHubContext<LeaderboardHub> hubContext, IConfiguration configuration)
    : BackgroundService
{
    private readonly TimeSpan _timerInterval = TimeSpan.FromSeconds(
        configuration.GetValue<int>("LeaderboardService:PollIntervalSeconds", 60));

    private readonly ConcurrentDictionary<(string competitionId, string leaderboardId), LeaderboardDto?> _previousResults = new();
    private readonly ConcurrentDictionary<string, ImmutableHashSet<(string competitionId, string leaderboardId)>> _connectionGroups = new();

    internal IEnumerable<(string competitionId, string leaderboardId)> ActiveGroups =>
        _connectionGroups.Values.SelectMany(g => g).Distinct();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(_timerInterval);
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
                foreach (var key in ActiveGroups)
                    await SafePushChanges(key.competitionId, key.leaderboardId);
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Leaderboard timer crashed: {ex}");
        }
    }

    private async Task SafePushChanges(string competitionId, string leaderboardId)
    {
        try
        {
            await PushChanges(competitionId, leaderboardId);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"PushChanges failed for {competitionId}/{leaderboardId}: {ex}");
        }
    }

    public void Subscribe(string connectionId, string competitionId, string leaderboardId)
    {
        var key = (competitionId, leaderboardId);
        _connectionGroups.AddOrUpdate(connectionId, ImmutableHashSet.Create(key), (_, existing) => existing.Add(key));
    }

    public void Unsubscribe(string connectionId, string competitionId, string leaderboardId) =>
        RemoveConnection(connectionId, (competitionId, leaderboardId));

    public void RemoveAllSubscriptions(string connectionId)
    {
        if (_connectionGroups.TryRemove(connectionId, out var groups))
            foreach (var key in groups)
                if (!ActiveGroups.Contains(key))
                    _previousResults.TryRemove(key, out _);
    }

    private void RemoveConnection(string connectionId, (string competitionId, string leaderboardId) key)
    {
        if (_connectionGroups.TryGetValue(connectionId, out var groups))
        {
            var updated = groups.Remove(key);
            if (updated.IsEmpty)
                _connectionGroups.TryRemove(connectionId, out _);
            else
                _connectionGroups[connectionId] = updated;
        }

        // Clean up snapshot if no connection subscribes to this group anymore
        if (!ActiveGroups.Contains(key))
            _previousResults.TryRemove(key, out _);
    }

    private async Task PushChanges(string competitionId, string leaderboardId)
    {
        Console.WriteLine($"{nameof(PushChanges)} {competitionId}, {leaderboardId}");
        var values = await apiClient.GetResults(competitionId, leaderboardId);
        var key = (competitionId, leaderboardId);

        var prevSnapshot = _previousResults.GetValueOrDefault(key, null);

        _previousResults.AddOrUpdate(key, values, (_, __) => values);

        var groupName = LeaderboardHub.GetCompetitionGroup(competitionId, leaderboardId);
        //if (!values.Equals(prevSnapshot, StringComparison.Ordinal))
        await hubContext.Clients
            .Group(groupName)
            .SendAsync("ReceiveRowUpdate", values.Items, CancellationToken.None);
        if (prevSnapshot != null && prevSnapshot.Columns.Count != values.Columns.Count)
            await hubContext.Clients
                .Group(groupName)
                .SendAsync("ReceiveColumnUpdate", values.Columns, CancellationToken.None);
    }
}
