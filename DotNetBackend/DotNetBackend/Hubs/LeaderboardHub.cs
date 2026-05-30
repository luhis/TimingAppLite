using DotNetBackend.Services;
using Microsoft.AspNetCore.SignalR;

namespace DotNetBackend.Hubs;

public class LeaderboardHub(LeaderboardService leaderboardService) : Hub
{
    public Task SubscribeToLeaderboard(string competitionId, string leaderboardId)
    {
        leaderboardService.Subscribe(Context.ConnectionId, competitionId, leaderboardId);
        return Groups.AddToGroupAsync(Context.ConnectionId, GetCompetitionGroup(competitionId, leaderboardId));
    }

    public Task UnsubscribeFromLeaderboard(string competitionId, string leaderboardId)
    {
        leaderboardService.Unsubscribe(Context.ConnectionId, competitionId, leaderboardId);
        return Groups.RemoveFromGroupAsync(Context.ConnectionId, GetCompetitionGroup(competitionId, leaderboardId));
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        leaderboardService.RemoveAllSubscriptions(Context.ConnectionId);
        return base.OnDisconnectedAsync(exception);
    }

    internal static string GetCompetitionGroup(string competitionId, string leaderboardId) =>
        $"competition:{competitionId},leaderboard:{leaderboardId}";
}

