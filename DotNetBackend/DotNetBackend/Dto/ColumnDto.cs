namespace DotNetBackend.Dto;

public sealed record ColumnDto
{
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}