namespace DotNetBackend.Dto;

public sealed record CompetitionDto
{
    public required IReadOnlyList<Dictionary<string, string>> Items { get; init; }
}
