using DotNetBackend.Sapphire;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace DotNetBackend.Tests.IntegrationTests;

public class ErrorPathTests
{
    private static HttpClient CreateClient(Action<Mock<IApiClient>> configure, out MockRepository mockRepo)
    {
        mockRepo = new MockRepository(MockBehavior.Strict);
        var mockApiClient = mockRepo.Create<IApiClient>();
        configure(mockApiClient);

        var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IApiClient));
                if (descriptor is not null)
                    services.Remove(descriptor);

                services.AddSingleton(mockApiClient.Object);
            }));

        return factory.CreateClient();
    }

    [Fact]
    public async Task LiveAllCompetitions_Returns500_WhenUpstreamThrows()
    {
        var client = CreateClient(mock =>
            mock.Setup(c => c.GetLiveAllCompetitions(It.IsAny<CancellationToken>()))
                .ThrowsAsync(new HttpRequestException("Upstream unavailable")),
            out var mockRepo);

        var response = await client.GetAsync("/API/1/LiveAllCompetitions", TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.InternalServerError);
        var content = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        content.Should().Contain("status");
        mockRepo.VerifyAll();
    }

    [Fact]
    public async Task LeaderBoards_Returns500_WhenUpstreamThrows()
    {
        var client = CreateClient(mock =>
            mock.Setup(c => c.GetLeaderboards(1, null, It.IsAny<CancellationToken>()))
                .ThrowsAsync(new HttpRequestException("Upstream unavailable")),
            out var mockRepo);

        var response = await client.GetAsync("/API/1/Competitions/1/LeaderBoards", TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.InternalServerError);
        mockRepo.VerifyAll();
    }

    [Fact]
    public async Task SiteName_Returns500_WhenUpstreamThrows()
    {
        var client = CreateClient(mock =>
            mock.Setup(c => c.GetSiteName(1, It.IsAny<CancellationToken>()))
                .ThrowsAsync(new HttpRequestException("Upstream unavailable")),
            out var mockRepo);

        var response = await client.GetAsync("/API/1/Competitions/1/SiteName", TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.InternalServerError);
        mockRepo.VerifyAll();
    }

    [Fact]
    public async Task SiteName_Returns500_WhenSiteNameNotFound()
    {
        var client = CreateClient(mock =>
            mock.Setup(c => c.GetSiteName(1, It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException("sitename not found in event list")),
            out var mockRepo);

        var response = await client.GetAsync("/API/1/Competitions/1/SiteName", TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.InternalServerError);
        mockRepo.VerifyAll();
    }

    [Fact]
    public async Task LiveAllCompetitions_ReturnsContentType_WhenSuccess()
    {
        var body = """[{"id":1}]"""u8.ToArray();
        var client = CreateClient(mock =>
            mock.Setup(c => c.GetLiveAllCompetitions(It.IsAny<CancellationToken>()))
                .ReturnsAsync((body, "application/json")),
            out var mockRepo);

        var response = await client.GetAsync("/API/1/LiveAllCompetitions", TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/json");
        mockRepo.VerifyAll();
    }

    [Fact]
    public async Task OpenApiEndpoint_IsAccessible_InDevelopment()
    {
        var client = CreateClient(_ => { }, out var mockRepo);

        var response = await client.GetAsync("/openapi/v1.json", TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        content.Should().Contain("openapi");
        mockRepo.VerifyAll();
    }
}
