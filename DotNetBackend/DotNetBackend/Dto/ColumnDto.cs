namespace DotNetBackend.Dto;

public record ColumnDto
{
    public string Name { get; init; }
    public string Label { get; init; }
}