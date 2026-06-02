using DotNetBackend.Services;
using Microsoft.AspNetCore.SignalR;

namespace DotNetBackend.Hubs;

public class LeaderboardHub(LeaderboardService leaderboardService) : Hub
{
    public override async Task OnConnectedAsync()
    {
        var context = Context.GetHttpContext()!;
        var competitionId = int.Parse(context.Request.Query["competitionId"]!);
        var leaderboardId = int.Parse(context.Request.Query["leaderboardId"]!);
        leaderboardService.Subscribe(Context.ConnectionId, competitionId, leaderboardId);
        await Groups.AddToGroupAsync(Context.ConnectionId, GetCompetitionGroup(competitionId, leaderboardId));
        await base.OnConnectedAsync();
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        leaderboardService.RemoveAllSubscriptions(Context.ConnectionId);
        return base.OnDisconnectedAsync(exception);
    }

    internal static string GetCompetitionGroup(int competitionId, int leaderboardId) =>
        $"competition:{competitionId},leaderboard:{leaderboardId}";
}

