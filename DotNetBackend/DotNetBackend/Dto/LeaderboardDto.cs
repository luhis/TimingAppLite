namespace DotNetBackend.Dto;

public sealed class LeaderboardDto
{
    public required IReadOnlyList<Dictionary<string, string>> Items { get; init; }
}