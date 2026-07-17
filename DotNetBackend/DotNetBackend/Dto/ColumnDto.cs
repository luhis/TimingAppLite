namespace DotNetBackend.Dto;

public sealed record ColumnDto
{
    public string Name { get; init; } = string.Empty;
    public string Label { get; init; } = string.Empty;
}