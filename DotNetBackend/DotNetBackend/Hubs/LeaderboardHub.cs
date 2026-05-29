using DotNetBackend.Sapphire;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Collections.Immutable;
using System.Text.Json;

namespace DotNetBackend.Hubs;

public class LeaderboardHub : Hub
{
    private static readonly ConcurrentDictionary<(string competitionId, string leaderboardId), ImmutableHashSet<string>> _previousRows = new();
    private static readonly ConcurrentDictionary<(string competitionId, string leaderboardId), int> _subscriberCounts = new();
    private static readonly ConcurrentDictionary<string, ImmutableHashSet<(string competitionId, string leaderboardId)>> _connectionGroups = new();
    private static readonly TimeSpan _timerInterval = TimeSpan.FromSeconds(60);
    private static readonly CancellationTokenSource _timerCancellation = new();
    private static int _timerStarted;

    private readonly IApiClient _apiClient;
    private readonly IHubContext<LeaderboardHub> _hubContext;

    public LeaderboardHub(IApiClient apiClient, IHubContext<LeaderboardHub> hubContext)
    {
        _apiClient = apiClient;
        _hubContext = hubContext;
        EnsureTimerStarted();
    }

    private void EnsureTimerStarted()
    {
        if (Interlocked.CompareExchange(ref _timerStarted, 1, 0) != 0)
            return;

        _ = Task.Run(async () =>
        {
            try
            {
                using var timer = new PeriodicTimer(_timerInterval);
                while (await timer.WaitForNextTickAsync(_timerCancellation.Token))
                {
                    foreach (var group in _subscriberCounts.Keys)
                        await PushChanges(group.competitionId, group.leaderboardId);
                }
            }
            catch (OperationCanceledException) { }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Leaderboard timer crashed: {ex}");
            }
        });
    }

    private async Task PushChanges(string competitionId, string leaderboardId)
    {
        var values = await _apiClient.GetResults(competitionId, leaderboardId);
        var key = (competitionId, leaderboardId);

        var serializedToItem = values.Items.ToDictionary(
            item => JsonSerializer.Serialize(new SortedDictionary<string, string>(item)),
            item => item);

        var currentSet = ImmutableHashSet.CreateRange(serializedToItem.Keys);
        var prevSnapshot = _previousRows.GetValueOrDefault(key, ImmutableHashSet<string>.Empty);
        var changedItems = currentSet.Except(prevSnapshot).Select(s => serializedToItem[s]).ToList();

        _previousRows.AddOrUpdate(key, currentSet, (_, __) => currentSet);

        //if (changedItems.Count > 0)
            await _hubContext.Clients.Group(GetCompetitionGroup(competitionId, leaderboardId))
                .SendAsync("ReceiveUpdate", changedItems, _timerCancellation.Token);
    }

    public Task SubscribeToLeaderboard(string competitionId, string leaderboardId)
    {
        var key = (competitionId, leaderboardId);
        _subscriberCounts.AddOrUpdate(key, 1, (_, v) => v + 1);
        _connectionGroups.AddOrUpdate(Context.ConnectionId, ImmutableHashSet.Create(key), (_, existing) => existing.Add(key));
        return Groups.AddToGroupAsync(Context.ConnectionId, GetCompetitionGroup(competitionId, leaderboardId));
    }

    public Task UnsubscribeFromLeaderboard(string competitionId, string leaderboardId)
    {
        var key = (competitionId, leaderboardId);
        RemoveConnection(Context.ConnectionId, key);
        return Groups.RemoveFromGroupAsync(Context.ConnectionId, GetCompetitionGroup(competitionId, leaderboardId));
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        if (_connectionGroups.TryRemove(Context.ConnectionId, out var groups))
            foreach (var key in groups)
                RemoveGroupIfEmpty(key);

        return base.OnDisconnectedAsync(exception);
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

        RemoveGroupIfEmpty(key);
    }

    private void RemoveGroupIfEmpty((string competitionId, string leaderboardId) key)
    {
        var newCount = _subscriberCounts.AddOrUpdate(key, 0, (_, v) => Math.Max(0, v - 1));
        if (newCount == 0)
        {
            _previousRows.TryRemove(key, out _);
            _subscriberCounts.TryRemove(key, out _);
        }
    }

    internal static string GetCompetitionGroup(string competitionId, string leaderboardId) =>
        $"competition:{competitionId},leaderboard:{leaderboardId}";
}
