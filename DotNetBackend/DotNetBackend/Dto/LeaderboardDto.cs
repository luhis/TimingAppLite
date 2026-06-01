namespace DotNetBackend.Dto;

public sealed class LeaderboardDto
{
    public List<ColumnDto> Columns { get; set; } = [];
    public List<Dictionary<string, string>> Items { get; set; } = [];
}
