using DotNetBackend.Dto;

namespace DotNetBackend.Sapphire;

public interface IApiClient
{
    Task<LeaderboardDto> GetResults(string competitionId, string leaderboardId);
    Task<IResult> GetLiveAllCompetitions(CancellationToken ct = default);
    Task<IResult> GetLeaderboards(int competionId, int? leaderboardId, CancellationToken ct = default);
}