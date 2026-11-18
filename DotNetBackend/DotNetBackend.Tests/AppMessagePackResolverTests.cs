using DotNetBackend.Dto;
using DotNetBackend.Serialization;
using MessagePack;

namespace DotNetBackend.Tests;

public class AppMessagePackResolverTests
{
    private static readonly MessagePackSerializerOptions Options =
        MessagePackSerializerOptions.Standard.WithResolver(AppMessagePackResolver.Instance);

    [Fact]
    public void Competition_RoundTrips()
    {
        var competition = new CompetitionDto { Id = "1", Active = "0", Name = "n", Dateddmmyyyy = "01/02/2026", Provisional = "p", Finalised = "f" };

        var result = MessagePackSerializer.Deserialize<CompetitionDto>(MessagePackSerializer.Serialize(competition, Options, TestContext.Current.CancellationToken), Options, TestContext.Current.CancellationToken);

        Assert.Equal(competition, result);
    }

    [Fact]
    public void Rows_RoundTrip()
    {
        var rows = new List<Dictionary<string, string>> { new() { ["a"] = "1", ["b"] = "2" } };

        var result = MessagePackSerializer.Deserialize<List<Dictionary<string, string>>>(MessagePackSerializer.Serialize(rows, Options, TestContext.Current.CancellationToken), Options, TestContext.Current.CancellationToken);

        Assert.Equal(rows[0], Assert.Single(result));
    }

    [Fact]
    public void Columns_UseCamelCaseKeys()
    {
        var columns = new List<ColumnDto> { new() { Name = "x", Label = "X" } };

        var map = MessagePackSerializer.Deserialize<List<Dictionary<string, string>>>(MessagePackSerializer.Serialize(columns, Options, TestContext.Current.CancellationToken), Options, TestContext.Current.CancellationToken);

        Assert.Equal("x", Assert.Single(map)["name"]);
    }
}
