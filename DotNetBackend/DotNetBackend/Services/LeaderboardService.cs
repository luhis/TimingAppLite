using DotNetBackend.Hubs;
using DotNetBackend.Sapphire;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Collections.Immutable;
using System.Text.Json;

namespace DotNetBackend.Services;

public sealed class LeaderboardService(IApiClient apiClient, IHubContext<LeaderboardHub> hubContext)
    : BackgroundService
{
    private static readonly TimeSpan TimerInterval = TimeSpan.FromSeconds(60);

    private readonly ConcurrentDictionary<(string competitionId, string leaderboardId), ImmutableHashSet<string>> _previousRows = new();
    private readonly ConcurrentDictionary<(string competitionId, string leaderboardId), int> _subscriberCounts = new();
    private readonly ConcurrentDictionary<string, ImmutableHashSet<(string competitionId, string leaderboardId)>> _connectionGroups = new();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimerInterval);
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
                foreach (var key in _subscriberCounts.Keys)
                    await PushChanges(key.competitionId, key.leaderboardId, stoppingToken);
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Leaderboard timer crashed: {ex}");
        }
    }

    public void Subscribe(string connectionId, string competitionId, string leaderboardId)
    {
        var key = (competitionId, leaderboardId);
        _subscriberCounts.AddOrUpdate(key, 1, (_, v) => v + 1);
        _connectionGroups.AddOrUpdate(connectionId, ImmutableHashSet.Create(key), (_, existing) => existing.Add(key));
    }

    public void Unsubscribe(string connectionId, string competitionId, string leaderboardId) =>
        RemoveConnection(connectionId, (competitionId, leaderboardId));

    public void RemoveAllSubscriptions(string connectionId)
    {
        if (_connectionGroups.TryRemove(connectionId, out var groups))
            foreach (var key in groups)
                DecrementGroup(key);
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

        DecrementGroup(key);
    }

    private void DecrementGroup((string competitionId, string leaderboardId) key)
    {
        var newCount = _subscriberCounts.AddOrUpdate(key, 0, (_, v) => Math.Max(0, v - 1));
        if (newCount == 0)
        {
            _previousRows.TryRemove(key, out _);
            _subscriberCounts.TryRemove(key, out _);
        }
    }

    private async Task PushChanges(string competitionId, string leaderboardId, CancellationToken cancellationToken)
    {
        var values = await apiClient.GetResults(competitionId, leaderboardId);
        var key = (competitionId, leaderboardId);

        var serializedToItem = values.Items.ToDictionary(
            item => JsonSerializer.Serialize(new SortedDictionary<string, string>(item)),
            item => item);

        var currentSet = ImmutableHashSet.CreateRange(serializedToItem.Keys);
        var prevSnapshot = _previousRows.GetValueOrDefault(key, ImmutableHashSet<string>.Empty);
        var changedItems = currentSet.Except(prevSnapshot).Select(s => serializedToItem[s]).ToList();

        _previousRows.AddOrUpdate(key, currentSet, (_, __) => currentSet);

        if (changedItems.Count > 0)
            await hubContext.Clients
                .Group(LeaderboardHub.GetCompetitionGroup(competitionId, leaderboardId))
                .SendAsync("ReceiveUpdate", changedItems, cancellationToken);
    }
}
