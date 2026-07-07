using System.Text.Json;
using DotNetBackend.Sapphire;

namespace DotNetBackend.Tests;

public class ForgivingStringConverterTests
{
    private static readonly JsonSerializerOptions Options = new()
    {
        Converters = { new ForgivingStringConverter() }
    };

    [Theory]
    [InlineData("false", "false")]
    [InlineData("true", "true")]
    [InlineData("42", "42")]
    [InlineData("\"hello\"", "hello")]
    [InlineData("\"\"", "")]
    public void Read_CoercesValueToString(string json, string expected)
    {
        var result = JsonSerializer.Deserialize<string>(json, Options);

        result.Should().Be(expected);
    }

    [Fact]
    public void Write_WritesStringValue()
    {
        var json = JsonSerializer.Serialize("hello", Options);

        json.Should().Be("\"hello\"");
    }

    [Fact]
    public void RoundTrip_PreservesValue()
    {
        var original = "test value";
        var json = JsonSerializer.Serialize(original, Options);
        var deserialized = JsonSerializer.Deserialize<string>(json, Options);

        deserialized.Should().Be(original);
    }
}

public class ForgivingDictionaryConverterTests
{
    private static readonly JsonSerializerOptions Options = new()
    {
        Converters = { new ForgivingDictionaryConverter() }
    };

    [Fact]
    public void Read_DeserializesStringValues()
    {
        var json = """{"name":"Alice","city":"London"}""";

        var result = JsonSerializer.Deserialize<Dictionary<string, string>>(json, Options);

        result.Should().ContainKeys("name", "city");
        result!["name"].Should().Be("Alice");
        result["city"].Should().Be("London");
    }

    [Fact]
    public void Read_CoercesBooleanValues()
    {
        var json = """{"active":true,"deleted":false}""";

        var result = JsonSerializer.Deserialize<Dictionary<string, string>>(json, Options);

        result.Should().ContainKeys("active", "deleted");
        result!["active"].Should().Be("true");
        result["deleted"].Should().Be("false");
    }

    [Fact]
    public void Read_CoercesNumericValues()
    {
        var json = """{"count":42,"price":9.99}""";

        var result = JsonSerializer.Deserialize<Dictionary<string, string>>(json, Options);

        result.Should().ContainKeys("count", "price");
        result!["count"].Should().Be("42");
        result["price"].Should().Be("9.99");
    }

    [Fact]
    public void Read_CoercesNullToEmptyString()
    {
        var json = """{"name":null}""";

        var result = JsonSerializer.Deserialize<Dictionary<string, string>>(json, Options);

        result.Should().ContainKey("name");
        result!["name"].Should().Be("");
    }

    [Fact]
    public void Read_EmptyObject_ReturnsEmptyDictionary()
    {
        var json = """{}""";

        var result = JsonSerializer.Deserialize<Dictionary<string, string>>(json, Options);

        result.Should().BeEmpty();
    }

    [Fact]
    public void Read_NonObjectToken_ThrowsJsonException()
    {
        var json = """[1,2,3]""";

        var act = () => JsonSerializer.Deserialize<Dictionary<string, string>>(json, Options);

        act.Should().Throw<JsonException>();
    }

    [Fact]
    public void Write_SerializesDictionary()
    {
        var dict = new Dictionary<string, string> { ["key"] = "value" };

        var json = JsonSerializer.Serialize(dict, Options);

        json.Should().Be("""{"key":"value"}""");
    }

    [Fact]
    public void RoundTrip_PreservesValues()
    {
        var original = new Dictionary<string, string>
        {
            ["name"] = "Alice",
            ["score"] = "42"
        };

        var json = JsonSerializer.Serialize(original, Options);
        var deserialized = JsonSerializer.Deserialize<Dictionary<string, string>>(json, Options);

        deserialized.Should().BeEquivalentTo(original);
    }
}
