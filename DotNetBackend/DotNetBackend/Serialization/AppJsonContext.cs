using DotNetBackend.Dto;
using DotNetBackend.Sapphire;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json.Serialization;

namespace DotNetBackend.Serialization;

[JsonSerializable(typeof(List<CompetitionDto>))]
[JsonSerializable(typeof(LeaderboardDto))]
[JsonSerializable(typeof(List<ColumnDto>))]
[JsonSerializable(typeof(List<Dictionary<string, string>>))]
[JsonSerializable(typeof(Dictionary<string, string>))]
[JsonSerializable(typeof(ProblemDetails))]
[JsonSourceGenerationOptions(
    PropertyNameCaseInsensitive = true,
    Converters = [typeof(ForgivingDictionaryConverter)])]
public partial class AppJsonContext : JsonSerializerContext;
