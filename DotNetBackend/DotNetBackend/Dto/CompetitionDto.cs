namespace DotNetBackend.Dto;

public record CompetitionDto
{
    public string Id { get; set; } = string.Empty;
    public string Active { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Dateddmmyyyy { get; set; } = string.Empty;
    public string Provisional { get; set; } = string.Empty;
    public string Finalised { get; set; } = string.Empty;
}
