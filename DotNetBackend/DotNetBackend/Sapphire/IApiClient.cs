using DotNetBackend.Dto;

namespace DotNetBackend.Sapphire;

public interface IApiClient
{
    Task<LeaderboardDto> GetLeaderboard(int competitionId, int leaderboardId, CancellationToken ct);
    Task<IReadOnlyList<CompetitionDto>> GetCompetitions(CancellationToken ct);
    Task<(byte[] Bytes, string ContentType)> GetLiveAllCompetitions(CancellationToken ct = default);
    Task<(byte[] Bytes, string ContentType)> GetLeaderboards(int competitionId, int? leaderboardId, CancellationToken ct = default);
    Task<string> GetSiteName(int competitionId, CancellationToken ct = default);
}