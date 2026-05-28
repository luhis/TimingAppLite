using DotNetBackend.Dto;

namespace DotNetBackend.Sapphire;

public interface IApiClient
{
    Task<LeaderboardDto> GetResults(string competitionId, string leaderboardId);
    Task<IResult> GetLiveAllCompetitions();
}