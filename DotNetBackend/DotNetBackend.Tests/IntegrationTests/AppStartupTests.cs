using DotNetBackend.Sapphire;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace DotNetBackend.Tests.IntegrationTests;

public class AppStartupTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public AppStartupTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
            builder.ConfigureServices(services =>
            {
                // Replace the real API client so tests don't make external HTTP calls
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IApiClient));
                if (descriptor is not null)
                    services.Remove(descriptor);

                var mockApiClient = new Mock<IApiClient>(MockBehavior.Strict);
                mockApiClient
                    .Setup(c => c.GetLiveAllCompetitions())
                    .ReturnsAsync(Results.Ok(new { items = Array.Empty<object>() }));
                mockApiClient
                    .Setup(c => c.GetLeaderboards(It.IsAny<int>(), It.IsAny<int?>()))
                    .ReturnsAsync(Results.Ok(new { items = Array.Empty<object>() }));

                services.AddSingleton(mockApiClient.Object);
            }));
    }

    [Fact]
    public async Task App_StartsUp_Returns200ForOpenApiEndpoint()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/openapi/v1.json");

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
    }

    [Fact]
    public async Task LiveAllCompetitions_ReturnsSuccess()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/API/1/LiveAllCompetitions");

        response.IsSuccessStatusCode.Should().BeTrue();
    }

    [Fact]
    public async Task LeaderBoards_ReturnsSuccess()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/API/1/Competitions/1/LeaderBoards");

        response.IsSuccessStatusCode.Should().BeTrue();
    }
}
