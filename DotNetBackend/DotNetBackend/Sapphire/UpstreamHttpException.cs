using System.Collections.ObjectModel;
using System.Net;

namespace DotNetBackend.Sapphire;

public sealed class UpstreamHttpException(
    HttpStatusCode statusCode,
    byte[] responseBody,
    string contentType,
    IReadOnlyDictionary<string, string[]>? responseHeaders = null)
    : Exception($"Upstream request failed with status {(int)statusCode} ({statusCode}).")
{
    public HttpStatusCode StatusCode { get; } = statusCode;
    public byte[] ResponseBody { get; } = responseBody;
    public string ContentType { get; } = contentType;
    public IReadOnlyDictionary<string, string[]> ResponseHeaders { get; } =
        responseHeaders ?? ReadOnlyDictionary<string, string[]>.Empty;
}
