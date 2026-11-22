using DotNetBackend.Serialization;
using System.Text.Json;

namespace DotNetBackend.Sapphire;

public sealed class SiteNameCache(string path) : IDisposable
{
    private readonly string _path = Path.GetFullPath(path);
    private readonly SemaphoreSlim _gate = new(1, 1);
    private Dictionary<int, string>? _entries;

    public async Task<string> GetOrAddAsync(int competitionId, Func<CancellationToken, Task<string>> factory, CancellationToken ct)
    {
        await _gate.WaitAsync(ct);
        try
        {
            _entries ??= await LoadAsync(ct);
            if (_entries.TryGetValue(competitionId, out var cached))
            {
                return cached;
            }

            var value = await factory(ct);
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new InvalidOperationException("Site name cannot be empty.");
            }

            var updated = new Dictionary<int, string>(_entries) { [competitionId] = value };
            await SaveAsync(updated, ct);
            _entries = updated;
            return value;
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task<Dictionary<int, string>> LoadAsync(CancellationToken ct)
    {
        FileStream stream;
        try
        {
            stream = File.OpenRead(_path);
        }
        catch (FileNotFoundException)
        {
            return [];
        }
        catch (DirectoryNotFoundException)
        {
            return [];
        }

        await using (stream)
        {
            var entries = await JsonSerializer.DeserializeAsync(stream, AppJsonContext.Default.DictionaryInt32String, ct)
                ?? throw new JsonException("Site name cache must be a JSON object.");
            if (entries.Values.Any(string.IsNullOrWhiteSpace))
            {
                throw new JsonException("Site name cache contains an empty site name.");
            }

            return entries;
        }
    }

    private async Task SaveAsync(Dictionary<int, string> entries, CancellationToken ct)
    {
        var directory = Path.GetDirectoryName(_path)!;
        Directory.CreateDirectory(directory);
        var temporaryPath = Path.Combine(directory, $".{Path.GetFileName(_path)}.{Guid.NewGuid():N}.tmp");
        try
        {
            await using (var stream = new FileStream(temporaryPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 4096, useAsync: true))
            {
                await JsonSerializer.SerializeAsync(stream, entries, AppJsonContext.Default.DictionaryInt32String, ct);
            }

            File.Move(temporaryPath, _path, overwrite: true);
        }
        finally
        {
            File.Delete(temporaryPath);
        }
    }

    public void Dispose() => _gate.Dispose();
}
