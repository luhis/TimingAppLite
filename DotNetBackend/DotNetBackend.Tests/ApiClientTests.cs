using DotNetBackend.Dto;
using DotNetBackend.Sapphire;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using System.Net;
using System.Net.Http.Headers;

namespace DotNetBackend.Tests;

public class ApiClientTests
{
    private static IApiClient CreateClient(
        HttpMessageHandler handler,
        IMemoryCache? cache = null,
        IConfiguration? configuration = null)
    {
        var factory = new StubHttpClientFactory(() => new HttpClient(handler));
        return new ApiClient(
            factory,
            cache ?? new MemoryCache(new MemoryCacheOptions()),
            configuration ?? new ConfigurationBuilder().Build());
    }

    [Fact]
    public async Task GetLiveAllCompetitions_ReturnsBytes_FromUpstream()
    {
        var body = """[{"id":1}]"""u8.ToArray();
        var handler = new StubHttpHandler(body, "application/json");

        var client = CreateClient(handler);
        var result = await client.GetLiveAllCompetitions(TestContext.Current.CancellationToken);

        result.Should().NotBeNull();
        handler.CallCount.Should().Be(1);
    }

    [Fact]
    public async Task GetLiveAllCompetitions_ReturnsCachedResponse_OnSecondCall()
    {
        var body = """[{"id":1}]"""u8.ToArray();
        var handler = new StubHttpHandler(body, "application/json");

        var client = CreateClient(handler);

        await client.GetLiveAllCompetitions(TestContext.Current.CancellationToken);
        await client.GetLiveAllCompetitions(TestContext.Current.CancellationToken);

        handler.CallCount.Should().Be(1, "second call should be served from cache");
    }

    [Fact]
    public async Task GetLeaderboards_ReturnsBytes_FromUpstream()
    {
        var body = """
            [            
                {
                    "id": "525",
                    "name": "Class Results Full"
                },
                {
                    "id": "337",
                    "name": "Detailed"
                },
                {
                    "id": "339",
                    "name": "Minimum"
                },
                {
                    "id": "338",
                    "name": "Overall"
                },
                {
                    "id": 99999,
                    "name": "Event List"
                }
            ]
            """u8.ToArray();
        var handler = new StubHttpHandler(body, "application/json");

        var client = CreateClient(handler);
        var result = await client.GetLeaderboards(1, null, TestContext.Current.CancellationToken);

        result.Should().NotBeNull();
        handler.CallCount.Should().Be(1);
    }

    [Fact]
    public async Task GetLeaderboards_ReturnsCachedResponse_OnSecondCallWithSameKey()
    {
        var body = """{"id":1}"""u8.ToArray();
        var handler = new StubHttpHandler(body, "application/json");

        var client = CreateClient(handler);

        await client.GetLeaderboards(1, 2, TestContext.Current.CancellationToken);
        await client.GetLeaderboards(1, 2, TestContext.Current.CancellationToken);

        handler.CallCount.Should().Be(1, "same key should be served from cache");
    }

    [Fact]
    public async Task GetLeaderboards_CallsUpstream_ForDifferentKeys()
    {
        var body = """{"id":1}"""u8.ToArray();
        var handler = new StubHttpHandler(body, "application/json");

        var client = CreateClient(handler);

        await client.GetLeaderboards(1, 2, TestContext.Current.CancellationToken);
        await client.GetLeaderboards(1, 3, TestContext.Current.CancellationToken);

        handler.CallCount.Should().Be(2, "different leaderboard IDs are different cache keys");
    }

    [Fact]
    public async Task GetLeaderboard_SharesCache_WithGetLeaderboards()
    {
        var body = """{"columns":[{"name":"Pos","label":"Position"}],"items":[{"Pos":"1"}]}"""u8.ToArray();
        var handler = new StubHttpHandler(body, "application/json");

        var client = CreateClient(handler);

        await client.GetLeaderboard(1, 2, TestContext.Current.CancellationToken);
        await client.GetLeaderboards(1, 2, TestContext.Current.CancellationToken);

        handler.CallCount.Should().Be(1, "GetLeaderboard and GetLeaderboards should share the same cache");
    }

    [Fact]
    public async Task GetLiveAllCompetitions_ThrowsHttpRequestException_OnNonSuccessStatus()
    {
        var handler = new StubHttpHandler([], "application/json", HttpStatusCode.ServiceUnavailable);
        var client = CreateClient(handler);

        var act = async () => await client.GetLiveAllCompetitions(TestContext.Current.CancellationToken);

        await act.Should().ThrowAsync<HttpRequestException>();
    }

    // -------------------------------------------------------------------------
    // GetResults
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetResults_DeserializesResponse_IntoLeaderboardDto()
    {
        var json = """
            {
              "columns": [{"name": "Pos", "label": "Position"}],
              "items": [{"Pos": "1", "Driver": "Alice"}]
            }
            """u8.ToArray();
        var handler = new StubHttpHandler(json, "application/json");

        var client = CreateClient(handler);
        var result = await client.GetLeaderboard(1, 2, TestContext.Current.CancellationToken);

        result.Columns.Should().ContainSingle(c => c.Name == "Pos" && c.Label == "Position");
        result.Items.Should().ContainSingle(r => r["Pos"] == "1" && r["Driver"] == "Alice");
    }

    [Fact]
    public async Task GetResults_ThrowsHttpRequestException_OnNonSuccessStatus()
    {
        var handler = new StubHttpHandler([], "application/json", HttpStatusCode.ServiceUnavailable);
        var client = CreateClient(handler);

        var act = async () => await client.GetLeaderboard(1, 2, TestContext.Current.CancellationToken);

        await act.Should().ThrowAsync<HttpRequestException>();
    }

    [Fact]
    public async Task GetResults_ReturnsEmptyCollections_WhenResponseHasNoData()
    {
        var json = """{"columns":[],"items":[]}""";
        var handler = new StubHttpHandler(System.Text.Encoding.UTF8.GetBytes(json), "application/json");

        var client = CreateClient(handler);
        var result = await client.GetLeaderboard(1, 2, TestContext.Current.CancellationToken);

        result.Columns.Should().BeEmpty();
        result.Items.Should().BeEmpty();
    }

    [Fact]
    public async Task GetCompetitions_DeserializesResponse_IntoCompetitionDto()
    {
        var json = """
            [
                {
                    "id": "1428",
                    "active": "2",
                    "name": "TDC JPM Autotest",
                    "dateddmmyyyy": "5th June 2026",
                    "provisional": "5th June 2026 21:07",
                    "finalised": null,
                    "sponsorlogo1": "",
                    "sponsorlink1": "",
                    "sponsorlogo2": "",
                    "sponsorlink2": "",
                    "sponsorlogo3": "",
                    "sponsorlink3": ""
                }
            ]
            """u8.ToArray();
        var handler = new StubHttpHandler(json, "application/json");

        var client = CreateClient(handler);
        var result = await client.GetCompetitions(TestContext.Current.CancellationToken);

        result.Should().ContainSingle();
    }

    // -------------------------------------------------------------------------
    // GetSiteName
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetSiteName_ExtractsSiteName_FromHtml()
    {
        var html = """<a href="https://example.com/somepage?sitename=MyRaceTrack&other=123">Link</a>""";
        var handler = new StubHttpHandler(System.Text.Encoding.UTF8.GetBytes(html), "text/html");

        var client = CreateClient(handler);
        var result = await client.GetSiteName(1, TestContext.Current.CancellationToken);

        result.Should().Be("MyRaceTrack");
    }

    [Fact]
    public async Task GetSiteName_ThrowsWhenSiteNameNotFound()
    {
        var html = """<html><body>No sitename here</body></html>""";
        var handler = new StubHttpHandler(System.Text.Encoding.UTF8.GetBytes(html), "text/html");

        var client = CreateClient(handler);
        var act = async () => await client.GetSiteName(1, TestContext.Current.CancellationToken);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*sitename not found*");
    }

    [Fact]
    public async Task GetSiteName_ReturnsCachedResponse_OnSecondCall()
    {
        var html = """<a href="https://example.com/page?sitename=TestTrack&other=1">Link</a>""";
        var handler = new StubHttpHandler(System.Text.Encoding.UTF8.GetBytes(html), "text/html");

        var client = CreateClient(handler);

        var first = await client.GetSiteName(1, TestContext.Current.CancellationToken);
        var second = await client.GetSiteName(1, TestContext.Current.CancellationToken);

        first.Should().Be("TestTrack");
        second.Should().Be("TestTrack");
        handler.CallCount.Should().Be(1, "second call should be served from cache");
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private sealed class StubHttpHandler(byte[] body, string contentType, HttpStatusCode statusCode = HttpStatusCode.OK)
        : HttpMessageHandler
    {
        public int CallCount { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CallCount++;
            var content = new ByteArrayContent(body);
            content.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
            return Task.FromResult(new HttpResponseMessage(statusCode) { Content = content });
        }
    }

    private sealed class StubHttpClientFactory(Func<HttpClient> client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client();
    }
}
