using DotNetBackend.Dto;

namespace DotNetBackend.Sapphire;

public interface IApiClient
{
    Task<LeaderboardDto> GetResults(string competitionId, string leaderboardId);
    Task<IResult> GetLiveAllCompetitions();
    Task<IResult> GetLeaderboards(int competionId, int? leaderboardId);
}