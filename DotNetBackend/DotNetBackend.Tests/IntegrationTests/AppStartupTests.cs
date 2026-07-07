using DotNetBackend.Sapphire;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace DotNetBackend.Tests.IntegrationTests;

public class AppStartupTests
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
        var client = CreateClient(mock =>
            mock.Setup(c => c.GetLiveAllCompetitions(It.IsAny<CancellationToken>()))
                .ReturnsAsync(Results.Ok(new { items = Array.Empty<object>() })),
            out var mockRepo);

        var response = await client.GetAsync("/API/1/LiveAllCompetitions", TestContext.Current.CancellationToken);

        response.IsSuccessStatusCode.Should().BeTrue();
        mockRepo.VerifyAll();
    }

    [Fact]
    public async Task LeaderBoards_ReturnsSuccess()
    {
        var client = CreateClient(mock =>
            mock.Setup(c => c.GetLeaderboards(1, null, It.IsAny<CancellationToken>()))
                .ReturnsAsync(Results.Ok(new { items = Array.Empty<object>() })),
            out var mockRepo);

        var response = await client.GetAsync("/API/1/Competitions/1/LeaderBoards", TestContext.Current.CancellationToken);

        response.IsSuccessStatusCode.Should().BeTrue();
        mockRepo.VerifyAll();
    }

    [Fact]
    public async Task LeaderBoardsWithBoardId_ReturnsSuccess()
    {
        var client = CreateClient(mock =>
            mock.Setup(c => c.GetLeaderboards(1, 2, It.IsAny<CancellationToken>()))
                .ReturnsAsync(Results.Ok(new { items = Array.Empty<object>() })),
            out var mockRepo);

        var response = await client.GetAsync("/API/1/Competitions/1/LeaderBoards/2", TestContext.Current.CancellationToken);

        response.IsSuccessStatusCode.Should().BeTrue();
        mockRepo.VerifyAll();
    }
}
