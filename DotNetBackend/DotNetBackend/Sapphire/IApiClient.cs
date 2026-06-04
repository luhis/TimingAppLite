using DotNetBackend.Dto;

namespace DotNetBackend.Sapphire;

public interface IApiClient
{
    Task<LeaderboardDto> GetResults(int competitionId, int leaderboardId, CancellationToken ct);
    Task<IResult> GetLiveAllCompetitions(CancellationToken ct = default);
    Task<IResult> GetLeaderboards(int competionId, int? leaderboardId, CancellationToken ct = default);
}