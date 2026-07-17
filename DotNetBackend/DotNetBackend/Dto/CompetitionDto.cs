namespace DotNetBackend.Dto;

public sealed record CompetitionDto
{
    public string Id { get; init; } = string.Empty;
    public string Active { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Dateddmmyyyy { get; init; } = string.Empty;
    public string Provisional { get; init; } = string.Empty;
    public string Finalised { get; init; } = string.Empty;
}
