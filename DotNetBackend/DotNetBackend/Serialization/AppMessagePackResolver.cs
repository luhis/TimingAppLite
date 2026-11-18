using DotNetBackend.Dto;
using MessagePack;
using MessagePack.Formatters;

namespace DotNetBackend.Serialization;

// Reflection-free resolver so MessagePack works under Native AOT (the default resolvers emit IL at runtime).
// Property names are camelCase to match the SignalR JSON protocol the frontend already consumes.
public sealed class AppMessagePackResolver : IFormatterResolver
{
    public static readonly AppMessagePackResolver Instance = new();

    private AppMessagePackResolver()
    {
    }

    public IMessagePackFormatter<T>? GetFormatter<T>() => FormatterCache<T>.Formatter;

    private static class FormatterCache<T>
    {
        public static readonly IMessagePackFormatter<T>? Formatter = Create();

        private static IMessagePackFormatter<T>? Create()
        {
            object? formatter = null;
            if (typeof(T) == typeof(CompetitionDto))
            {
                formatter = new CompetitionDtoFormatter();
            }
            else if (typeof(T) == typeof(ColumnDto))
            {
                formatter = new ColumnDtoFormatter();
            }
            else if (typeof(T) == typeof(List<ColumnDto>))
            {
                formatter = new ListFormatter<ColumnDto>();
            }
            else if (typeof(T) == typeof(Dictionary<string, string>))
            {
                formatter = new DictionaryFormatter<string, string>();
            }
            else if (typeof(T) == typeof(List<Dictionary<string, string>>))
            {
                formatter = new ListFormatter<Dictionary<string, string>>();
            }
            else if (typeof(T) == typeof(string))
            {
                formatter = NullableStringFormatter.Instance;
            }
            else if (typeof(T) == typeof(int))
            {
                formatter = Int32Formatter.Instance;
            }
            else if (typeof(T) == typeof(bool))
            {
                formatter = BooleanFormatter.Instance;
            }
            else if (typeof(T) == typeof(object))
            {
                formatter = new ObjectFormatter();
            }

            return (IMessagePackFormatter<T>?)formatter;
        }
    }

    // SignalR serializes arguments typed as object (e.g. the invocation argument array); dispatch on runtime type.
    private sealed class ObjectFormatter : IMessagePackFormatter<object?>
    {
        public void Serialize(ref MessagePackWriter writer, object? value, MessagePackSerializerOptions options)
        {
            switch (value)
            {
                case null:
                    writer.WriteNil();
                    break;
                case string s:
                    writer.Write(s);
                    break;
                case int i:
                    writer.Write(i);
                    break;
                case bool b:
                    writer.Write(b);
                    break;
                case CompetitionDto c:
                    options.Resolver.GetFormatterWithVerify<CompetitionDto>().Serialize(ref writer, c, options);
                    break;
                case ColumnDto col:
                    options.Resolver.GetFormatterWithVerify<ColumnDto>().Serialize(ref writer, col, options);
                    break;
                case List<ColumnDto> cols:
                    options.Resolver.GetFormatterWithVerify<List<ColumnDto>>().Serialize(ref writer, cols, options);
                    break;
                case Dictionary<string, string> d:
                    options.Resolver.GetFormatterWithVerify<Dictionary<string, string>>().Serialize(ref writer, d, options);
                    break;
                case List<Dictionary<string, string>> rows:
                    options.Resolver.GetFormatterWithVerify<List<Dictionary<string, string>>>().Serialize(ref writer, rows, options);
                    break;
                default:
                    throw new MessagePackSerializationException($"Type {value.GetType()} is not supported by the AOT MessagePack resolver.");
            }
        }

        public object? Deserialize(ref MessagePackReader reader, MessagePackSerializerOptions options)
        {
            // Hub methods take no arguments, so only primitives need to round-trip.
            if (reader.TryReadNil())
            {
                return null;
            }

            switch (reader.NextMessagePackType)
            {
                case MessagePackType.String:
                    return reader.ReadString();
                case MessagePackType.Integer:
                    return reader.ReadInt32();
                case MessagePackType.Boolean:
                    return reader.ReadBoolean();
                default:
                    reader.Skip();
                    return null;
            }
        }
    }

    private sealed class ColumnDtoFormatter : IMessagePackFormatter<ColumnDto?>
    {
        public void Serialize(ref MessagePackWriter writer, ColumnDto? value, MessagePackSerializerOptions options)
        {
            if (value is null)
            {
                writer.WriteNil();
                return;
            }

            writer.WriteMapHeader(2);
            writer.Write("name");
            writer.Write(value.Name);
            writer.Write("label");
            writer.Write(value.Label);
        }

        public ColumnDto? Deserialize(ref MessagePackReader reader, MessagePackSerializerOptions options)
        {
            if (reader.TryReadNil())
            {
                return null;
            }

            var name = string.Empty;
            var label = string.Empty;
            var count = reader.ReadMapHeader();
            for (var i = 0; i < count; i++)
            {
                switch (reader.ReadString())
                {
                    case "name":
                        name = reader.ReadString() ?? string.Empty;
                        break;
                    case "label":
                        label = reader.ReadString() ?? string.Empty;
                        break;
                    default:
                        reader.Skip();
                        break;
                }
            }

            return new ColumnDto { Name = name, Label = label };
        }
    }

    private sealed class CompetitionDtoFormatter : IMessagePackFormatter<CompetitionDto?>
    {
        public void Serialize(ref MessagePackWriter writer, CompetitionDto? value, MessagePackSerializerOptions options)
        {
            if (value is null)
            {
                writer.WriteNil();
                return;
            }

            writer.WriteMapHeader(6);
            writer.Write("id");
            writer.Write(value.Id);
            writer.Write("active");
            writer.Write(value.Active);
            writer.Write("name");
            writer.Write(value.Name);
            writer.Write("dateddmmyyyy");
            writer.Write(value.Dateddmmyyyy);
            writer.Write("provisional");
            writer.Write(value.Provisional);
            writer.Write("finalised");
            writer.Write(value.Finalised);
        }

        public CompetitionDto? Deserialize(ref MessagePackReader reader, MessagePackSerializerOptions options)
        {
            if (reader.TryReadNil())
            {
                return null;
            }

            string id = string.Empty, active = string.Empty, name = string.Empty,
                date = string.Empty, provisional = string.Empty, finalised = string.Empty;
            var count = reader.ReadMapHeader();
            for (var i = 0; i < count; i++)
            {
                switch (reader.ReadString())
                {
                    case "id":
                        id = reader.ReadString() ?? string.Empty;
                        break;
                    case "active":
                        active = reader.ReadString() ?? string.Empty;
                        break;
                    case "name":
                        name = reader.ReadString() ?? string.Empty;
                        break;
                    case "dateddmmyyyy":
                        date = reader.ReadString() ?? string.Empty;
                        break;
                    case "provisional":
                        provisional = reader.ReadString() ?? string.Empty;
                        break;
                    case "finalised":
                        finalised = reader.ReadString() ?? string.Empty;
                        break;
                    default:
                        reader.Skip();
                        break;
                }
            }

            return new CompetitionDto
            {
                Id = id,
                Active = active,
                Name = name,
                Dateddmmyyyy = date,
                Provisional = provisional,
                Finalised = finalised,
            };
        }
    }
}
