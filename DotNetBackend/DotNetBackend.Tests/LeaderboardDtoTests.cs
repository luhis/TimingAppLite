using System.Text.Json;
using DotNetBackend.Dto;
using DotNetBackend.Sapphire;

namespace DotNetBackend.Tests;

public class LeaderboardDtoTests
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new ForgivingDictionaryConverter() }
    };

    [Fact]
    public void Deserialize_FullLeaderboard()
    {
        var json = """
        {
          "columns": [
        {
            "name": "classname",
            "label": "Class"
        },
        {
            "name": "entry",
            "label": "Entry"
        },
        {
            "name": "driver",
            "label": "Driver"
        },
        {
            "name": "nav",
            "label": "Navigator"
        },
        {
            "name": "skill",
            "label": "Skill"
        },
        {
            "name": "club",
            "label": "Club"
        },
        {
            "name": "champ",
            "label": "Champs"
        },
        {
            "name": "car",
            "label": "Car"
        },
        {
            "name": "engine",
            "label": "Capacity"
        },
        {
            "name": "test1",
            "label": "Test 1"
        },
        {
            "name": "total1",
            "label": "Sub-Total"
        },
        {
            "name": "test2",
            "label": "Test 2"
        },
        {
            "name": "total2",
            "label": "Sub-Total"
        },
        {
            "name": "test3",
            "label": "Test 3"
        },
        {
            "name": "total3",
            "label": "Sub-Total"
        },
        {
            "name": "test4",
            "label": "Test 4"
        },
        {
            "name": "total4",
            "label": "Total"
        },
        {
            "name": "position",
            "label": "Class"
        },
        {
            "name": "overall",
            "label": "Overall"
        },
        {
            "name": "award",
            "label": "Award"
        }
          ],
          "items": [
        {
                "classname": "A = Saloon \/ Estate \/ 4 seat coupe, up to 1400cc",
                "entry": "46",
                "driver": "James Northfield",
                "nav": "",
                "skill": "Expert",
                "club": "Sevenoaks and District Motor Club",
                "champ": "",
                "car": "Citroen AX",
                "engine": "954",
                "test1": "48.2 47.9 48.1  TOT=96",
                "total1": "96.0",
                "test2": "60.0 59.1 58.2  TOT=117.3",
                "total2": "213.3",
                "test3": "42.6 42.1 WT=70.7  TOT=84.7",
                "total3": "298.0",
                "test4": "57.0 55.9 55.8  TOT=111.7",
                "total4": "409.7",
                "position": 1,
                "overall": 14,
                "award": ""
            },
            {
                "classname": "A = Saloon \/ Estate \/ 4 seat coupe, up to 1400cc",
                "entry": "37",
                "driver": "Patrick Osiak",
                "nav": "Sam Hurry",
                "skill": "Young Driver",
                "club": "Sevenoaks and District Motor Club",
                "champ": "",
                "car": "Citroen Saxo",
                "engine": "1143CC",
                "test1": "52.1 50.0 49.2  TOT=99.2",
                "total1": "99.2",
                "test2": "61.1 60.7 60.2  TOT=120.9",
                "total2": "220.1",
                "test3": "41.6 41.1 40.7  TOT=81.8",
                "total3": "301.9",
                "test4": "58.7 56.7 56.5  TOT=113.2",
                "total4": "415.1",
                "position": 2,
                "overall": 16,
                "award": ""
            }
          ]
        }
        """;

        var result = JsonSerializer.Deserialize<LeaderboardDto>(json, Options);

        result.Should().NotBeNull();
        result!.Columns.Should().HaveCount(20);
        result.Items.Should().HaveCount(2);
    }

    [Fact]
    public void Deserialize_EmptyLeaderboard()
    {
        var json = """{"columns":[],"items":[]}""";

        var result = JsonSerializer.Deserialize<LeaderboardDto>(json, Options);

        result.Should().NotBeNull();
        result!.Columns.Should().BeEmpty();
        result.Items.Should().BeEmpty();
    }

    [Fact]
    public void Deserialize_MissingColumns_DefaultsToEmptyList()
    {
        var json = """{"items":[{"entry":"1","driver":"Alice"}]}""";

        var result = JsonSerializer.Deserialize<LeaderboardDto>(json, Options);

        result.Should().NotBeNull();
        result!.Columns.Should().BeEmpty();
    }

    [Fact]
    public void Deserialize_MissingItems_DefaultsToEmptyList()
    {
        var json = """{"columns":[{"name":"pos","label":"Pos"}]}""";

        var result = JsonSerializer.Deserialize<LeaderboardDto>(json, Options);

        result.Should().NotBeNull();
        result!.Items.Should().BeEmpty();
    }

    [Fact]
    public void Deserialize_CoercesNumericValuesToString()
    {
        var json = """
        {
          "columns": [{"name":"pos","label":"Pos"}],
          "items": [{"pos":1}]
        }
        """;

        var result = JsonSerializer.Deserialize<LeaderboardDto>(json, Options);

        result.Should().NotBeNull();
        result!.Items[0]["pos"].Should().Be("1");
    }

    [Fact]
    public void Deserialize_CoercesBooleanValuesToString()
    {
        var json = """
        {
          "columns": [{"name":"active","label":"Active"}],
          "items": [{"active":true}]
        }
        """;

        var result = JsonSerializer.Deserialize<LeaderboardDto>(json, Options);

        result.Should().NotBeNull();
        result!.Items[0]["active"].Should().Be("true");
    }

    [Fact]
    public void Deserialize_CoercesNullValuesToEmptyString()
    {
        var json = """
        {
          "columns": [{"name":"driver","label":"Driver"}],
          "items": [{"driver":null}]
        }
        """;

        var result = JsonSerializer.Deserialize<LeaderboardDto>(json, Options);

        result.Should().NotBeNull();
        result!.Items[0]["driver"].Should().Be("");
    }

    [Fact]
    public void Deserialize_EmptyObject_ReturnsDefaultValues()
    {
        var json = """{}""";

        var result = JsonSerializer.Deserialize<LeaderboardDto>(json, Options);

        result.Should().NotBeNull();
        result!.Columns.Should().BeEmpty();
        result.Items.Should().BeEmpty();
    }
}
