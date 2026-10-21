using DotNetBackend.Dto;
using DotNetBackend.Hubs;
using DotNetBackend.Sapphire;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Globalization;
using System.Text.RegularExpressions;

namespace DotNetBackend.Services;

public sealed partial class LeaderboardService(IApiClient apiClient, IHubContext<LeaderboardHub> hubContext, IConfiguration configuration, ILogger<LeaderboardService> logger)
    : BackgroundService
{
    private readonly TimeSpan _timerInterval = TimeSpan.FromSeconds(
        configuration.GetValue("LeaderboardService:PollIntervalSeconds", 60));
    private readonly bool _optimisePushUpdates =
        configuration.GetValue("LeaderboardService:OptimisePushUpdates", true);

    private readonly ConcurrentDictionary<(int competitionId, int leaderboardId), LeaderboardDto?> _previousResults = new();
    private readonly ConcurrentDictionary<string, (int competitionId, int leaderboardId)> _connectionGroups = new();

    internal IEnumerable<(int competitionId, int leaderboardId)> GetActiveGroups() =>
        _connectionGroups.Values.Distinct();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(_timerInterval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                var activeGroups = GetActiveGroups().ToArray();
                if (activeGroups.Length == 0)
                    continue;

                var competitions = await apiClient.GetCompetitions(stoppingToken);
                foreach (var key in activeGroups)
                {
                    var comp = competitions.FirstOrDefault(c => c.Id == key.competitionId.ToString());
                    if (comp is null)
                    {
                        logger.LogWarning("Competition {CompetitionId} not found in API response, skipping", key.competitionId);
                        continue;
                    }

                    if (comp.Active == ActiveStatus.Live && IsCompetitionToday(comp))
                    {
                        await SafePushChanges(key, stoppingToken);
                    }
                    else
                    {
                        await PushCompetitionUpdate(key.competitionId, key.leaderboardId, comp, stoppingToken);
                    }
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Poll cycle failed, will retry next interval");
            }
        }
    }

    private async Task PushCompetitionUpdate(int competitionId, int leaderboardId, CompetitionDto competition, CancellationToken stoppingToken)
    {
        var groupName = LeaderboardHub.GetCompetitionGroup(competitionId, leaderboardId);
        await hubContext.Clients.Group(groupName)
            .SendAsync("ReceiveCompetitionUpdate", competition, stoppingToken);
    }

    private async Task SafePushChanges((int competitionId, int leaderboardId) key, CancellationToken ct)
    {
        try
        {
            await PushChanges(key, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "PushChanges failed for {CompetitionId}/{LeaderboardId}", key.competitionId, key.leaderboardId);
        }
    }

    public void Subscribe(string connectionId, (int competitionId, int leaderboardId) key) =>
        _connectionGroups[connectionId] = key;

    public void RemoveAllSubscriptions(string connectionId)
    {
        if (_connectionGroups.TryRemove(connectionId, out var key))
            if (!GetActiveGroups().Contains(key))
                _previousResults.TryRemove(key, out _);
    }

    internal async Task PushChanges((int competitionId, int leaderboardId) key, CancellationToken ct)
    {
        logger.LogInformation("{Method} {CompetitionId}, {LeaderboardId}", nameof(PushChanges), key.competitionId, key.leaderboardId);
        var values = await apiClient.GetLeaderboard(key.competitionId, key.leaderboardId, ct);

        for (var i = 0; i < values.Items.Count; i++)
            values.Items[i]["_index"] = i.ToString();

        var prevSnapshot = _previousResults.GetValueOrDefault(key);

        if (_connectionGroups.Values.Any(g => g == key))
            _previousResults[key] = values;

        var groupName = LeaderboardHub.GetCompetitionGroup(key.competitionId, key.leaderboardId);

        if (!_optimisePushUpdates || prevSnapshot is null)
        {
            await hubContext.Clients.Group(groupName)
                .SendAsync("ReceiveRowUpdate", values.Items, ct);
        }
        else
        {
            var prevByEntry = prevSnapshot.Items
                .Where(r => r.ContainsKey("entry"))
                .GroupBy(r => r["entry"])
                .ToDictionary(g => g.Key, g => g.Last());

            var changedRows = values.Items
                .Where(row => row.ContainsKey("entry")
                    && (!prevByEntry.TryGetValue(row["entry"], out var prev)
                        || !RowsEqual(row, prev)))
                .ToList();

            if (changedRows.Count > 0)
            {
                logger.LogInformation("Result changes detected, updating. Comp: {competitionId} board: {leaderboardId} count: {Count}", key.competitionId, key.leaderboardId, changedRows.Count);
                await hubContext.Clients.Group(groupName)
                    .SendAsync("ReceiveRowUpdate", changedRows, ct);

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
                .SendAsync("ReceiveColumnUpdate", values.Columns, ct);
        }
    }

    [GeneratedRegex(@"\b(\d{1,2})(st|nd|rd|th)\b", RegexOptions.IgnoreCase)]
    private static partial Regex DateOrdinalSuffixRegex();

    private static bool IsCompetitionToday(CompetitionDto competition)
    {
        if (string.IsNullOrWhiteSpace(competition.Dateddmmyyyy))
            return false;

        var dateText = DateOrdinalSuffixRegex().Replace(competition.Dateddmmyyyy.Trim(), "$1");
        if (!DateTime.TryParseExact(dateText, "d MMMM yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var competitionDate))
            return false;

        return competitionDate.Date == DateTime.Today;
    }

    private static bool RowsEqual(Dictionary<string, string> x, Dictionary<string, string> y)
    {
        if (x.Count != y.Count) return false;
        foreach (var (k, v) in x)
            if (!y.TryGetValue(k, out var yv) || v != yv) return false;
        return true;
    }
}
