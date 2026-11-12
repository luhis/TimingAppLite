using DotNetBackend.Sapphire;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace DotNetBackend.Tests.IntegrationTests;

public class AppStartupTests
{
    private static HttpClient CreateClient(
        Action<Mock<IApiClient>> configure,
        out MockRepository mockRepo,
        bool backendDisabled = false)
    {
        mockRepo = new MockRepository(MockBehavior.Strict);
        var mockApiClient = mockRepo.Create<IApiClient>();
        configure(mockApiClient);

        var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            if (backendDisabled)
                builder.UseSetting("Backend:Disabled", "true");

            builder.ConfigureServices(services =>
            {
                if (!backendDisabled)
                {
                    var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IApiClient));
                    if (descriptor is not null)
                        services.Remove(descriptor);

                    services.AddSingleton(mockApiClient.Object);
                }
            });
        });

        return factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = !backendDisabled
        });
    }

    [Fact]
    public async Task App_StartsUp_Returns200ForOpenApiEndpoint()
    {
        var client = CreateClient(_ => { }, out var mockRepo);

        var response = await client.GetAsync("/openapi/v1.json", TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        mockRepo.VerifyAll();
    }

    [Fact]
    public async Task LiveAllCompetitions_ReturnsSuccess()
    {
        var body = """{"items":[]}"""u8.ToArray();
        var client = CreateClient(mock =>
            mock.Setup(c => c.GetLiveAllCompetitions(It.IsAny<CancellationToken>()))
                .ReturnsAsync((body, "application/json")),
            out var mockRepo);

        var response = await client.GetAsync("/API/1/LiveAllCompetitions", TestContext.Current.CancellationToken);

        response.IsSuccessStatusCode.Should().BeTrue();
        mockRepo.VerifyAll();
    }

    [Fact]
    public async Task LiveAllCompetitions_ReturnsCacheControlHeader()
    {
        var body = """{"items":[]}"""u8.ToArray();
        var client = CreateClient(mock =>
            mock.Setup(c => c.GetLiveAllCompetitions(It.IsAny<CancellationToken>()))
                .ReturnsAsync((body, "application/json")),
            out var mockRepo);

        var response = await client.GetAsync("/API/1/LiveAllCompetitions", TestContext.Current.CancellationToken);

        response.Headers.CacheControl.Should().NotBeNull();
        response.Headers.CacheControl!.Public.Should().BeTrue();
        response.Headers.CacheControl.MaxAge.Should().Be(TimeSpan.FromSeconds(30));
        response.Headers.CacheControl.Extensions.Should().ContainSingle(e => e.Name == "stale-if-error" && e.Value == "600");
        mockRepo.VerifyAll();
    }

    [Fact]
    public async Task LeaderBoards_ReturnsSuccess()
    {
        var body = """{"items":[]}"""u8.ToArray();
        var client = CreateClient(mock =>
            mock.Setup(c => c.GetLeaderboards(1, null, It.IsAny<CancellationToken>()))
                .ReturnsAsync((body, "application/json")),
            out var mockRepo);

        var response = await client.GetAsync("/API/1/Competitions/1/LeaderBoards", TestContext.Current.CancellationToken);

        response.IsSuccessStatusCode.Should().BeTrue();
        mockRepo.VerifyAll();
    }

    [Fact]
    public async Task LeaderBoardsWithBoardId_ReturnsSuccess()
    {
        var body = """{"items":[]}"""u8.ToArray();
        var client = CreateClient(mock =>
            mock.Setup(c => c.GetLeaderboards(1, 2, It.IsAny<CancellationToken>()))
                .ReturnsAsync((body, "application/json")),
            out var mockRepo);

        var response = await client.GetAsync("/API/1/Competitions/1/LeaderBoards/2", TestContext.Current.CancellationToken);

        response.IsSuccessStatusCode.Should().BeTrue();
        mockRepo.VerifyAll();
    }

    [Fact]
    public async Task SiteName_ReturnsSuccess()
    {
        var client = CreateClient(mock =>
            mock.Setup(c => c.GetSiteName(1, It.IsAny<CancellationToken>()))
                .ReturnsAsync("TestTrack"),
            out var mockRepo);

        var response = await client.GetAsync("/API/1/Competitions/1/SiteName", TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        content.Should().Be("TestTrack");
        mockRepo.VerifyAll();
    }

    [Fact]
    public async Task Healthz_ReturnsSuccess()
    {
        var client = CreateClient(_ => { }, out var mockRepo);

        var response = await client.GetAsync("/healthz", TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        mockRepo.VerifyAll();
    }

    [Fact]
    public async Task BackendDisabled_RedirectsRequestsToSapphireWith307()
    {
        var client = CreateClient(_ => { }, out var mockRepo, backendDisabled: true);

        var response = await client.GetAsync(
            "/API/1/Competitions/42/SiteName?source=registration",
            TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.TemporaryRedirect);
        response.Headers.Location!.AbsoluteUri.Should().Be(
            "https://autotest.sapphire-solutions.co.uk/API/1/Competitions/42/SiteName?source=registration");
        mockRepo.VerifyAll();
    }

    [Fact]
    public async Task BackendDisabled_RedirectsSignalRRequestsInsteadOfStartingHub()
    {
        var client = CreateClient(_ => { }, out var mockRepo, backendDisabled: true);
        using var request = new HttpRequestMessage(HttpMethod.Post, "/hubs/LeaderBoard/negotiate?negotiateVersion=1");

        var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.TemporaryRedirect);
        response.Headers.Location!.AbsoluteUri.Should().Be(
            "https://autotest.sapphire-solutions.co.uk/hubs/LeaderBoard/negotiate?negotiateVersion=1");
        mockRepo.VerifyAll();
    }
}
