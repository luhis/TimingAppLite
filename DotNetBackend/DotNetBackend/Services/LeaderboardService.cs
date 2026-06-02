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
    private readonly bool _optimisePushUpdates =
        configuration.GetValue<bool>("LeaderboardService:OptimisePushUpdates", true);

    private readonly ConcurrentDictionary<(int competitionId, int leaderboardId), LeaderboardDto?> _previousResults = new();
    private readonly ConcurrentDictionary<string, ImmutableHashSet<(int competitionId, int leaderboardId)>> _connectionGroups = new();

    internal IEnumerable<(int competitionId, int leaderboardId)> ActiveGroups =>
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

    private async Task SafePushChanges(int competitionId, int leaderboardId)
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

    public void Subscribe(string connectionId, int competitionId, int leaderboardId)
    {
        var key = (competitionId, leaderboardId);
        _connectionGroups.AddOrUpdate(connectionId, ImmutableHashSet.Create(key), (_, existing) => existing.Add(key));
    }

    public void Unsubscribe(string connectionId, int competitionId, int leaderboardId) =>
        RemoveConnection(connectionId, (competitionId, leaderboardId));

    public void RemoveAllSubscriptions(string connectionId)
    {
        if (_connectionGroups.TryRemove(connectionId, out var groups))
            foreach (var key in groups)
                if (!ActiveGroups.Contains(key))
                    _previousResults.TryRemove(key, out _);
    }

    // Compares two leaderboard rows (Dictionary<string, string>) by value equality
    private sealed class ItemComparer : IEqualityComparer<Dictionary<string, string>>
    {
        internal static readonly ItemComparer Instance = new();
        public bool Equals(Dictionary<string, string>? x, Dictionary<string, string>? y)
        {
            if (ReferenceEquals(x, y)) return true;
            if (x is null || y is null || x.Count != y.Count) return false;
            foreach (var (k, v) in x)
                if (!y.TryGetValue(k, out var yv) || v != yv) return false;
            return true;
        }
        public int GetHashCode(Dictionary<string, string> obj) => obj.Count;
    }

    private void RemoveConnection(string connectionId, (int competitionId, int leaderboardId) key)
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

    private async Task PushChanges(int competitionId, int leaderboardId)
    {
        Console.WriteLine($"{nameof(PushChanges)} {competitionId}, {leaderboardId}");
        var values = await apiClient.GetResults(competitionId, leaderboardId);
        var key = (competitionId, leaderboardId);

        var prevSnapshot = _previousResults.GetValueOrDefault(key, null);

        _previousResults.AddOrUpdate(key, values, (_, __) => values);

        var groupName = LeaderboardHub.GetCompetitionGroup(competitionId, leaderboardId);
        var rowsChanged = prevSnapshot == null
            || !prevSnapshot.Items.SequenceEqual(values.Items, ItemComparer.Instance);
        if (!_optimisePushUpdates || rowsChanged)
            await hubContext.Clients
                .Group(groupName)
                .SendAsync("ReceiveRowUpdate", values.Items, CancellationToken.None);
        if (!_optimisePushUpdates || (prevSnapshot != null && prevSnapshot.Columns.Count != values.Columns.Count))
            await hubContext.Clients
                .Group(groupName)
                .SendAsync("ReceiveColumnUpdate", values.Columns, CancellationToken.None);
    }
}
