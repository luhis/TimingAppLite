namespace DotNetBackend.Dto;

public record ColumnDto
{
    public string Name { get; init; } = string.Empty;
    public string Label { get; init; } = string.Empty;
}