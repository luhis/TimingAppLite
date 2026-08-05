using DotNetBackend.Hubs;

namespace DotNetBackend.Tests;

public class LeaderboardHubTests
{
    [Fact]
    public void GetCompetitionGroup_FormatsCorrectly()
    {
        var result = LeaderboardHub.GetCompetitionGroup(42, 7);

        result.Should().Be("competition:42,leaderboard:7");
    }

    [Fact]
    public void GetCompetitionGroup_WithZeroIds_FormatsCorrectly()
    {
        var result = LeaderboardHub.GetCompetitionGroup(0, 0);

        result.Should().Be("competition:0,leaderboard:0");
    }

    [Fact]
    public void GetCompetitionGroup_WithLargeIds_FormatsCorrectly()
    {
        var result = LeaderboardHub.GetCompetitionGroup(999999, 888888);

        result.Should().Be("competition:999999,leaderboard:888888");
    }
}
