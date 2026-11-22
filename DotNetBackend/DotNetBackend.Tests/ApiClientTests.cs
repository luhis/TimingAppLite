using DotNetBackend.Sapphire;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using System.Net;
using System.Net.Http.Headers;

namespace DotNetBackend.Tests;

public class ApiClientTests : IDisposable
{
    private readonly string _cacheDirectory = Path.Combine(Path.GetTempPath(), $"TimingAppLite-tests-{Guid.NewGuid():N}");
    private readonly List<SiteNameCache> _siteNameCaches = [];
    private string CachePath => Path.Combine(_cacheDirectory, "site-names.json");

    private IApiClient CreateClient(
        HttpMessageHandler handler,
        IMemoryCache? cache = null,
        IConfiguration? configuration = null)
    {
        var factory = new StubHttpClientFactory(() => new HttpClient(handler));
        var siteNameCache = new SiteNameCache(CachePath);
        _siteNameCaches.Add(siteNameCache);
        return new ApiClient(
            factory,
            cache ?? new MemoryCache(new MemoryCacheOptions()),
            configuration ?? new ConfigurationBuilder().Build(),
            siteNameCache);
    }

    public void Dispose()
    {
        foreach (var cache in _siteNameCaches)
        {
            cache.Dispose();
        }

        if (Directory.Exists(_cacheDirectory))
        {
            Directory.Delete(_cacheDirectory, recursive: true);
        }
    }

    [Fact]
    public async Task GetLiveAllCompetitions_ReturnsBytes_FromUpstream()
    {
        var body = """[{"id":1}]"""u8.ToArray();
        var handler = new StubHttpHandler(body, "application/json");

        var client = CreateClient(handler);
        var result = await client.GetLiveAllCompetitions(TestContext.Current.CancellationToken);

        result.Bytes.Should().Equal(body);
        result.ContentType.Should().Be("application/json");
        handler.CallCount.Should().Be(1);
        handler.RequestUris.Should().ContainSingle().Which.AbsoluteUri.Should()
            .Be("https://timingapplive.co.uk/API/1/LiveAllCompetitions/");
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

        result.Bytes.Should().Equal(body);
        result.ContentType.Should().Be("application/json");
        handler.CallCount.Should().Be(1);
        handler.RequestUris.Should().ContainSingle().Which.AbsoluteUri.Should()
            .Be("https://timingapplive.co.uk/API/1/Competitions/1/Leaderboards/");
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
    public async Task GetLiveAllCompetitions_WhenUpstream429AfterWarmCache_ReturnsStaleCachedResponse()
    {
        var okBody = """[{"id":1}]"""u8.ToArray();
        var tooManyBody = """{"error":"rate limited"}"""u8.ToArray();
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ApiClient:CacheDurationSeconds"] = "30",
            ["ApiClient:StaleCacheDurationSeconds"] = "600"
        }).Build();

        var handler = new SequenceHttpHandler(
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(okBody)
                {
                    Headers = { ContentType = MediaTypeHeaderValue.Parse("application/json") }
                }
            },
            new HttpResponseMessage(HttpStatusCode.TooManyRequests)
            {
                Content = new ByteArrayContent(tooManyBody)
                {
                    Headers = { ContentType = MediaTypeHeaderValue.Parse("application/json") }
                }
            },
            new HttpResponseMessage(HttpStatusCode.TooManyRequests)
            {
                Content = new ByteArrayContent(tooManyBody)
                {
                    Headers = { ContentType = MediaTypeHeaderValue.Parse("application/json") }
                },
                Headers = { RetryAfter = new RetryConditionHeaderValue(TimeSpan.Zero) }
            },
            new HttpResponseMessage(HttpStatusCode.TooManyRequests)
            {
                Content = new ByteArrayContent(tooManyBody)
                {
                    Headers = { ContentType = MediaTypeHeaderValue.Parse("application/json") }
                }
            },
            new HttpResponseMessage(HttpStatusCode.TooManyRequests)
            {
                Content = new ByteArrayContent(tooManyBody)
                {
                    Headers = { ContentType = MediaTypeHeaderValue.Parse("application/json") }
                }
            });

        var client = CreateClient(handler, cache, config);

        var first = await client.GetLiveAllCompetitions(TestContext.Current.CancellationToken);
        cache.Remove(nameof(IApiClient.GetLiveAllCompetitions));
        var second = await client.GetLiveAllCompetitions(TestContext.Current.CancellationToken);

        first.Bytes.Should().Equal(okBody);
        second.Bytes.Should().Equal(okBody, "stale data should be returned when upstream is rate limited");
    }

    [Fact]
    public async Task GetLiveAllCompetitions_ThrowsUpstreamHttpException_OnNonSuccessStatus()
    {
        var handler = new StubHttpHandler([], "application/json", HttpStatusCode.ServiceUnavailable);
        var client = CreateClient(handler);

        var act = async () => await client.GetLiveAllCompetitions(TestContext.Current.CancellationToken);

        await act.Should().ThrowAsync<UpstreamHttpException>();
    }

    [Fact]
    public async Task GetLiveAllCompetitions_PreservesUpstreamErrorBody()
    {
        var body = """{"error":"unavailable"}"""u8.ToArray();
        var handler = new StubHttpHandler(body, "application/problem+json", HttpStatusCode.ServiceUnavailable);
        var client = CreateClient(handler);

        var act = async () => await client.GetLiveAllCompetitions(TestContext.Current.CancellationToken);

        var error = await act.Should().ThrowAsync<UpstreamHttpException>();
        error.Which.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        error.Which.ResponseBody.Should().Equal(body);
        error.Which.ContentType.Should().Be("application/problem+json");
    }

    [Fact]
    public async Task GetLiveAllCompetitions_RetriesRateLimit()
    {
        var body = """[{"id":1}]"""u8.ToArray();
        var handler = new SequenceHttpHandler(
            new HttpResponseMessage(HttpStatusCode.TooManyRequests)
            {
                Headers = { RetryAfter = new RetryConditionHeaderValue(TimeSpan.Zero) }
            },
            new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(body) });
        var client = CreateClient(handler);

        var result = await client.GetLiveAllCompetitions(TestContext.Current.CancellationToken);

        result.Bytes.Should().Equal(body);
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
        handler.RequestUris.Should().ContainSingle().Which.AbsoluteUri.Should()
            .Be("https://timingapplive.co.uk/API/1/Competitions/1/Leaderboards/2");
    }

    [Fact]
    public async Task GetResults_ThrowsUpstreamHttpException_OnNonSuccessStatus()
    {
        var handler = new StubHttpHandler([], "application/json", HttpStatusCode.ServiceUnavailable);
        var client = CreateClient(handler);

        var act = async () => await client.GetLeaderboard(1, 2, TestContext.Current.CancellationToken);

        await act.Should().ThrowAsync<UpstreamHttpException>();
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

    [Fact]
    public async Task GetCompetitions_ThrowsUpstreamHttpException_OnNonSuccessStatus()
    {
        var handler = new StubHttpHandler([], "application/json", HttpStatusCode.ServiceUnavailable);
        var client = CreateClient(handler);

        var act = async () => await client.GetCompetitions(TestContext.Current.CancellationToken);

        await act.Should().ThrowAsync<UpstreamHttpException>();
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

    [Fact]
    public async Task GetSiteName_UsesDirectUrl_AndCachesByCompetition()
    {
        var html = """<a href="https://example.com/page?sitename=TestTrack&other=1">Link</a>""";
        var handler = new StubHttpHandler(System.Text.Encoding.UTF8.GetBytes(html), "text/html");
        var client = CreateClient(handler);

        var siteName = await client.GetSiteName(1471, TestContext.Current.CancellationToken);
        var cached = await client.GetSiteName(1471, TestContext.Current.CancellationToken);
        var otherCompetition = await client.GetSiteName(1472, TestContext.Current.CancellationToken);

        siteName.Should().Be("TestTrack");
        cached.Should().Be("TestTrack");
        otherCompetition.Should().Be("TestTrack");
        handler.RequestUris.Should().HaveCount(2);
        handler.RequestUris[0].AbsoluteUri.Should().Be("https://timingapplive.co.uk/eventlist.php?event=1471");
        handler.RequestUris[1].AbsoluteUri.Should().Be("https://timingapplive.co.uk/eventlist.php?event=1472");
    }

    [Fact]
    public async Task GetSiteName_PersistsMultipleCompetitionsAcrossClientRestart()
    {
        var firstHandler = new StubHttpHandler("""<a href="?sitename=First&x=1">"""u8.ToArray(), "text/html");
        var firstClient = CreateClient(firstHandler);
        await firstClient.GetSiteName(1, TestContext.Current.CancellationToken);

        var secondHandler = new StubHttpHandler("""<a href="?sitename=Second&x=1">"""u8.ToArray(), "text/html");
        var secondClient = CreateClient(secondHandler);
        var first = await secondClient.GetSiteName(1, TestContext.Current.CancellationToken);
        var second = await secondClient.GetSiteName(2, TestContext.Current.CancellationToken);

        first.Should().Be("First");
        second.Should().Be("Second");
        secondHandler.CallCount.Should().Be(1);
        using var json = System.Text.Json.JsonDocument.Parse(await File.ReadAllTextAsync(CachePath, TestContext.Current.CancellationToken));
        json.RootElement.GetProperty("1").GetString().Should().Be("First");
        json.RootElement.GetProperty("2").GetString().Should().Be("Second");

        var unavailable = new StubHttpHandler([], "text/plain", HttpStatusCode.ServiceUnavailable);
        var restartedClient = CreateClient(unavailable);
        (await restartedClient.GetSiteName(1, TestContext.Current.CancellationToken)).Should().Be("First");
        (await restartedClient.GetSiteName(2, TestContext.Current.CancellationToken)).Should().Be("Second");
        unavailable.CallCount.Should().Be(0);
    }

    [Fact]
    public async Task GetSiteName_ConcurrentRequestsShareFetchAndPersistAllEntries()
    {
        var handler = new StubHttpHandler("""<a href="?sitename=Track&x=1">"""u8.ToArray(), "text/html");
        var client = CreateClient(handler);
        var ct = TestContext.Current.CancellationToken;

        var results = await Task.WhenAll(
            client.GetSiteName(1, ct), client.GetSiteName(1, ct),
            client.GetSiteName(2, ct), client.GetSiteName(2, ct));

        results.Should().Equal("Track", "Track", "Track", "Track");
        handler.CallCount.Should().Be(2);
        var restartedClient = CreateClient(new StubHttpHandler([], "text/plain", HttpStatusCode.ServiceUnavailable));
        (await restartedClient.GetSiteName(1, ct)).Should().Be("Track");
        (await restartedClient.GetSiteName(2, ct)).Should().Be("Track");
    }

    [Fact]
    public async Task GetSiteName_InvalidCacheIsReportedWithoutCallingUpstream()
    {
        Directory.CreateDirectory(_cacheDirectory);
        await File.WriteAllTextAsync(CachePath, "{invalid", TestContext.Current.CancellationToken);
        var handler = new StubHttpHandler("""<a href="?sitename=Track&x=1">"""u8.ToArray(), "text/html");
        var client = CreateClient(handler);

        var act = async () => await client.GetSiteName(1, TestContext.Current.CancellationToken);

        await act.Should().ThrowAsync<System.Text.Json.JsonException>();
        handler.CallCount.Should().Be(0);
        (await File.ReadAllTextAsync(CachePath, TestContext.Current.CancellationToken)).Should().Be("{invalid");
    }

    [Fact]
    public async Task GetSiteName_FailedFetchDoesNotCreateCacheEntry()
    {
        var handler = new StubHttpHandler("""<html>No sitename here</html>"""u8.ToArray(), "text/html");
        var client = CreateClient(handler);

        var act = async () => await client.GetSiteName(1, TestContext.Current.CancellationToken);

        await act.Should().ThrowAsync<InvalidOperationException>();
        File.Exists(CachePath).Should().BeFalse();
    }

    [Fact]
    public async Task SiteNameCache_FailedWriteDoesNotCacheValueAndCanBeRetried()
    {
        using var cache = new SiteNameCache(CachePath);
        var ct = TestContext.Current.CancellationToken;
        var calls = 0;
        Task<string> Fetch(CancellationToken _)
        {
            calls++;
            if (calls == 1)
            {
                Directory.CreateDirectory(CachePath);
            }

            return Task.FromResult("Track");
        }

        var act = async () => await cache.GetOrAddAsync(1, Fetch, ct);
        var error = await Record.ExceptionAsync(act);
        error.Should().Match<Exception>(ex => ex is IOException || ex is UnauthorizedAccessException);
        Directory.Delete(CachePath);
        (await cache.GetOrAddAsync(1, Fetch, ct)).Should().Be("Track");
        calls.Should().Be(2);
        File.Exists(CachePath).Should().BeTrue();
    }

    [Fact]
    public async Task GetSiteName_ThrowsOnUpstreamError()
    {
        var handler = new StubHttpHandler("unavailable"u8.ToArray(), "text/plain", HttpStatusCode.ServiceUnavailable);
        var client = CreateClient(handler);

        var act = async () => await client.GetSiteName(1, TestContext.Current.CancellationToken);

        var error = await act.Should().ThrowAsync<UpstreamHttpException>();
        error.Which.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private sealed class StubHttpHandler(byte[] body, string contentType, HttpStatusCode statusCode = HttpStatusCode.OK)
        : HttpMessageHandler
    {
        public int CallCount { get; private set; }
        public List<Uri> RequestUris { get; } = [];

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CallCount++;
            RequestUris.Add(request.RequestUri ?? throw new InvalidOperationException("Request URI is missing"));
            var content = new ByteArrayContent(body);
            content.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
            return Task.FromResult(new HttpResponseMessage(statusCode) { Content = content });
        }
    }

    private sealed class SequenceHttpHandler(params HttpResponseMessage[] responses) : HttpMessageHandler
    {
        private readonly Queue<HttpResponseMessage> _responses = new(responses);

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (_responses.Count == 0)
            {
                throw new InvalidOperationException("No more stub responses configured.");
            }

            return Task.FromResult(_responses.Dequeue());
        }
    }

    private sealed class StubHttpClientFactory(Func<HttpClient> client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client();
    }
}
