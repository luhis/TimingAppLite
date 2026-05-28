namespace DotNetBackend.Dto;

public sealed class CompetitionDto
{
    public required IReadOnlyList<Dictionary<string, string>> Items { get; init; }
}
