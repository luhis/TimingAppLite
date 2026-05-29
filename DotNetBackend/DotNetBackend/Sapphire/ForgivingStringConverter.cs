using System.Text;
using System.Text.Json;

namespace DotNetBackend.Sapphire;

public sealed class ForgivingStringConverter : System.Text.Json.Serialization.JsonConverter<string>
{
    public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        reader.TokenType switch
        {
            JsonTokenType.False => "false",
            JsonTokenType.True => "true",
            JsonTokenType.Number => Encoding.UTF8.GetString(reader.ValueSpan),
            _ => reader.GetString(),
        };

    public override void Write(Utf8JsonWriter writer, string value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value);
}