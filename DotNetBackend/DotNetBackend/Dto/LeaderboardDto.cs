namespace DotNetBackend.Dto;

public sealed record LeaderboardDto
{
    public List<ColumnDto> Columns { get; init; } = [];
    public List<Dictionary<string, string>> Items { get; init; } = [];
}
