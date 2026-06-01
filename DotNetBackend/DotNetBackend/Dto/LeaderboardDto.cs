namespace DotNetBackend.Dto;

public sealed record LeaderboardDto
{
    public required List<ColumnDto> Columns { get; init; }
    public required List<Dictionary<string, string>> Items { get; init; }
}
