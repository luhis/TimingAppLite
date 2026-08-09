using DotNetBackend.Dto;
using DotNetBackend.Hubs;
using DotNetBackend.Sapphire;
using DotNetBackend.Services;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace DotNetBackend.Tests.IntegrationTests;

public class SignalRTests
{
    private static (WebApplicationFactory<Program> Factory, HttpClient Client) CreateServer(
        Action<Mock<IApiClient>> configureApi,
        out MockRepository mockRepo)
    {
        mockRepo = new MockRepository(MockBehavior.Strict);
        var mockApiClient = mockRepo.Create<IApiClient>();
        mockApiClient
            .Setup(m => m.GetCompetitions(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<CompetitionDto>());
        configureApi(mockApiClient);

        var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                var apiDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IApiClient));
                if (apiDescriptor is not null)
                    services.Remove(apiDescriptor);

                var hostedDescriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(IHostedService) && d.ImplementationType == typeof(LeaderboardService));
                if (hostedDescriptor is not null)
                    services.Remove(hostedDescriptor);

                var singletonDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(LeaderboardService));
                if (singletonDescriptor is not null)
                    services.Remove(singletonDescriptor);

                services.AddSingleton(mockApiClient.Object);
                services.AddSingleton<LeaderboardService>();
                services.AddHostedService(sp => sp.GetRequiredService<LeaderboardService>());
            });
        });

        return (factory, factory.CreateClient());
    }

    private static HubConnection BuildConnection(
        WebApplicationFactory<Program> factory,
        HttpClient httpClient,
        string queryString)
    {
        return new HubConnectionBuilder()
            .WithUrl(
                new Uri(httpClient.BaseAddress!, $"/hubs/LeaderBoard{queryString}"),
                options =>
                {
                    options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
                })
            .WithAutomaticReconnect()
            .Build();
    }

    [Fact]
    public async Task Connect_ValidParams_Connected()
    {
        var (factory, httpClient) = CreateServer(_ => { }, out _);
        await using var disposable = factory;

        var connection = BuildConnection(factory, httpClient, "?competitionId=1&leaderboardId=2");

        await connection.StartAsync(TestContext.Current.CancellationToken);

        connection.State.Should().Be(HubConnectionState.Connected);

        await connection.StopAsync(TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task ConnectAndReceiveRowUpdate_ReceivesData()
    {
        var (factory, httpClient) = CreateServer(_ => { }, out _);
        await using var disposable = factory;

        var connection = BuildConnection(factory, httpClient, "?competitionId=1&leaderboardId=2");
        var tcs = new TaskCompletionSource<List<Dictionary<string, string>>>();
        connection.On("ReceiveRowUpdate", (List<Dictionary<string, string>> items) => tcs.TrySetResult(items));

        await connection.StartAsync(TestContext.Current.CancellationToken);

        var hubContext = factory.Server.Services.GetRequiredService<IHubContext<LeaderboardHub>>();
        var groupName = LeaderboardHub.GetCompetitionGroup(1, 2);
        var rows = new List<Dictionary<string, string>>
        {
            new() { ["entry"] = "1", ["pos"] = "1", ["driver"] = "Alice" }
        };

        await hubContext.Clients.Group(groupName).SendAsync("ReceiveRowUpdate", rows, TestContext.Current.CancellationToken);

        var received = await tcs.Task.WaitAsync(TimeSpan.FromSeconds(5), TestContext.Current.CancellationToken);

        received.Should().ContainSingle()
            .Which.Should().ContainKey("driver").WhoseValue.Should().Be("Alice");

        await connection.StopAsync(TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task ConnectAndReceiveColumnUpdate_ReceivesColumns()
    {
        var (factory, httpClient) = CreateServer(_ => { }, out _);
        await using var disposable = factory;

        var connection = BuildConnection(factory, httpClient, "?competitionId=1&leaderboardId=2");
        var tcs = new TaskCompletionSource<List<ColumnDto>>();
        connection.On("ReceiveColumnUpdate", (List<ColumnDto> columns) => tcs.TrySetResult(columns));

        await connection.StartAsync(TestContext.Current.CancellationToken);

        var hubContext = factory.Server.Services.GetRequiredService<IHubContext<LeaderboardHub>>();
        var groupName = LeaderboardHub.GetCompetitionGroup(1, 2);
        var columns = new List<ColumnDto>
        {
            new() { Name = "pos", Label = "Position" },
            new() { Name = "driver", Label = "Driver" }
        };

        await hubContext.Clients.Group(groupName).SendAsync("ReceiveColumnUpdate", columns, TestContext.Current.CancellationToken);

        var received = await tcs.Task.WaitAsync(TimeSpan.FromSeconds(5), TestContext.Current.CancellationToken);

        received.Should().HaveCount(2);
        received[0].Name.Should().Be("pos");
        received[1].Name.Should().Be("driver");

        await connection.StopAsync(TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task ConnectAndReceiveCompetitionUpdate_ReceivesCompetition()
    {
        var (factory, httpClient) = CreateServer(_ => { }, out _);
        await using var disposable = factory;

        var connection = BuildConnection(factory, httpClient, "?competitionId=1&leaderboardId=2");
        var tcs = new TaskCompletionSource<CompetitionDto>();
        connection.On("ReceiveCompetitionUpdate", (CompetitionDto comp) => tcs.TrySetResult(comp));

        await connection.StartAsync(TestContext.Current.CancellationToken);

        var hubContext = factory.Server.Services.GetRequiredService<IHubContext<LeaderboardHub>>();
        var groupName = LeaderboardHub.GetCompetitionGroup(1, 2);
        var competition = new CompetitionDto { Id = "1", Active = ActiveStatus.Finalised, Name = "Test Comp" };

        await hubContext.Clients.Group(groupName).SendAsync("ReceiveCompetitionUpdate", competition, TestContext.Current.CancellationToken);

        var received = await tcs.Task.WaitAsync(TimeSpan.FromSeconds(5), TestContext.Current.CancellationToken);

        received.Id.Should().Be("1");
        received.Name.Should().Be("Test Comp");
        received.Active.Should().Be(ActiveStatus.Finalised);

        await connection.StopAsync(TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Connect_MissingQueryParams_AbortsConnection()
    {
        var (factory, httpClient) = CreateServer(_ => { }, out _);
        await using var disposable = factory;

        var connection = BuildConnection(factory, httpClient, "");
        await connection.StartAsync(TestContext.Current.CancellationToken);

        await Task.Delay(500, TestContext.Current.CancellationToken);

        connection.State.Should().Be(HubConnectionState.Disconnected);
    }

    [Fact]
    public async Task Connect_InvalidQueryParams_AbortsConnection()
    {
        var (factory, httpClient) = CreateServer(_ => { }, out _);
        await using var disposable = factory;

        var connection = BuildConnection(factory, httpClient, "?competitionId=abc&leaderboardId=xyz");
        await connection.StartAsync(TestContext.Current.CancellationToken);

        await Task.Delay(500, TestContext.Current.CancellationToken);

        connection.State.Should().Be(HubConnectionState.Disconnected);
    }

    [Fact]
    public async Task Connect_TwoClients_SameGroup_BothReceiveMessages()
    {
        var (factory, httpClient) = CreateServer(_ => { }, out _);
        await using var disposable = factory;

        var connection1 = BuildConnection(factory, httpClient, "?competitionId=1&leaderboardId=2");
        var connection2 = BuildConnection(factory, httpClient, "?competitionId=1&leaderboardId=2");

        var tcs1 = new TaskCompletionSource<List<Dictionary<string, string>>>();
        var tcs2 = new TaskCompletionSource<List<Dictionary<string, string>>>();
        connection1.On("ReceiveRowUpdate", (List<Dictionary<string, string>> items) => tcs1.TrySetResult(items));
        connection2.On("ReceiveRowUpdate", (List<Dictionary<string, string>> items) => tcs2.TrySetResult(items));

        await connection1.StartAsync(TestContext.Current.CancellationToken);
        await connection2.StartAsync(TestContext.Current.CancellationToken);

        var hubContext = factory.Server.Services.GetRequiredService<IHubContext<LeaderboardHub>>();
        var groupName = LeaderboardHub.GetCompetitionGroup(1, 2);
        var rows = new List<Dictionary<string, string>>
        {
            new() { ["entry"] = "1", ["pos"] = "1", ["driver"] = "Alice" }
        };

        await hubContext.Clients.Group(groupName).SendAsync("ReceiveRowUpdate", rows, TestContext.Current.CancellationToken);

        var received1 = await tcs1.Task.WaitAsync(TimeSpan.FromSeconds(5), TestContext.Current.CancellationToken);
        var received2 = await tcs2.Task.WaitAsync(TimeSpan.FromSeconds(5), TestContext.Current.CancellationToken);

        received1.Should().ContainSingle()
            .Which.Should().ContainKey("driver").WhoseValue.Should().Be("Alice");
        received2.Should().ContainSingle()
            .Which.Should().ContainKey("driver").WhoseValue.Should().Be("Alice");

        await connection1.StopAsync(TestContext.Current.CancellationToken);
        await connection2.StopAsync(TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Connect_DifferentGroups_DoesNotCrossReceive()
    {
        var (factory, httpClient) = CreateServer(_ => { }, out _);
        await using var disposable = factory;

        var connection1 = BuildConnection(factory, httpClient, "?competitionId=1&leaderboardId=2");
        var connection2 = BuildConnection(factory, httpClient, "?competitionId=1&leaderboardId=99");

        var tcs1 = new TaskCompletionSource<List<Dictionary<string, string>>>();
        var tcs2NotExpected = new TaskCompletionSource<List<Dictionary<string, string>>>();
        connection1.On("ReceiveRowUpdate", (List<Dictionary<string, string>> items) => tcs1.TrySetResult(items));
        connection2.On("ReceiveRowUpdate", (List<Dictionary<string, string>> items) => tcs2NotExpected.TrySetResult(items));

        await connection1.StartAsync(TestContext.Current.CancellationToken);
        await connection2.StartAsync(TestContext.Current.CancellationToken);

        var hubContext = factory.Server.Services.GetRequiredService<IHubContext<LeaderboardHub>>();
        var groupName = LeaderboardHub.GetCompetitionGroup(1, 2);
        var rows = new List<Dictionary<string, string>>
        {
            new() { ["entry"] = "1", ["pos"] = "1", ["driver"] = "Alice" }
        };

        await hubContext.Clients.Group(groupName).SendAsync("ReceiveRowUpdate", rows, TestContext.Current.CancellationToken);

        var received1 = await tcs1.Task.WaitAsync(TimeSpan.FromSeconds(5), TestContext.Current.CancellationToken);
        received1.Should().ContainSingle()
            .Which.Should().ContainKey("driver").WhoseValue.Should().Be("Alice");

        var completed = await Task.WhenAny(tcs2NotExpected.Task, Task.Delay(1000, TestContext.Current.CancellationToken));
        completed.Should().NotBe(tcs2NotExpected.Task, "Client in different group should not receive the message");

        await connection1.StopAsync(TestContext.Current.CancellationToken);
        await connection2.StopAsync(TestContext.Current.CancellationToken);
    }
}
