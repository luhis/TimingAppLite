using DotNetBackend.Dto;
using DotNetBackend.Hubs;
using DotNetBackend.Sapphire;
using DotNetBackend.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace DotNetBackend.Tests;

public class LeaderboardServiceExecuteTests
{
    private readonly MockRepository _mockRepo = new(MockBehavior.Strict);

    private (LeaderboardService service, Mock<IApiClient> apiClient, Mock<IHubContext<LeaderboardHub>> hubContext) CreateService(
        bool optimisePushUpdates = true)
    {
        var apiClient = _mockRepo.Create<IApiClient>();
        var hubContext = _mockRepo.Create<IHubContext<LeaderboardHub>>();
        var service = new LeaderboardService(
            apiClient.Object,
            hubContext.Object,
            new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["LeaderboardService:PollIntervalSeconds"] = "1",
                    ["LeaderboardService:OptimisePushUpdates"] = optimisePushUpdates.ToString()
                })
                .Build(),
            NullLogger<LeaderboardService>.Instance);
        return (service, apiClient, hubContext);
    }

    [Fact]
    public async Task ExecuteAsync_CallsGetCompetitions_WhenActiveGroupsExist()
    {
        var (service, apiClient, hubContext) = CreateService();
        service.Subscribe("conn1", (1, 2));

        var competitions = new List<CompetitionDto>
        {
            new() { Id = "1", Active = ActiveStatus.Live, Name = "Test" }
        };
        apiClient.Setup(a => a.GetCompetitions(It.IsAny<CancellationToken>()))
            .ReturnsAsync(competitions);

        var leaderboard = new LeaderboardDto { Items = [new() { ["entry"] = "1" }] };
        apiClient.Setup(a => a.GetLeaderboard(1, 2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(leaderboard);

        var clientProxy = new Mock<IClientProxy>(MockBehavior.Strict);
        var hubClients = new Mock<IHubClients>(MockBehavior.Strict);
        hubClients.Setup(c => c.Group(It.IsAny<string>())).Returns(clientProxy.Object);
        hubContext.Setup(h => h.Clients).Returns(hubClients.Object);
        clientProxy
            .Setup(p => p.SendCoreAsync(It.IsAny<string>(), It.IsAny<object?[]>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        using var cts = new CancellationTokenSource();
        await service.StartAsync(cts.Token);
        await Task.Delay(1500, TestContext.Current.CancellationToken);
        await cts.CancelAsync();
        await service.StopAsync(CancellationToken.None);

        apiClient.Verify(a => a.GetCompetitions(It.IsAny<CancellationToken>()), Times.AtLeastOnce);
        _mockRepo.VerifyAll();
    }

    [Fact]
    public async Task ExecuteAsync_DoesNotPush_WhenNoActiveGroups()
    {
        var (service, apiClient, hubContext) = CreateService();

        apiClient.Setup(a => a.GetCompetitions(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<CompetitionDto>());

        using var cts = new CancellationTokenSource();
        await service.StartAsync(cts.Token);
        await Task.Delay(1500, TestContext.Current.CancellationToken);
        await cts.CancelAsync();
        await service.StopAsync(CancellationToken.None);

        apiClient.Verify(a => a.GetCompetitions(It.IsAny<CancellationToken>()), Times.AtLeastOnce);
        hubContext.Verify(h => h.Clients, Times.Never);
        _mockRepo.VerifyAll();
    }

    [Fact]
    public async Task ExecuteAsync_WhenGetCompetitionsThrows_ContinuesPolling()
    {
        var (service, apiClient, hubContext) = CreateService();
        service.Subscribe("conn1", (1, 2));

        var callCount = 0;
        apiClient.Setup(a => a.GetCompetitions(It.IsAny<CancellationToken>()))
            .ReturnsAsync(() =>
            {
                Interlocked.Increment(ref callCount);
                if (callCount == 1)
                    throw new HttpRequestException("Upstream error");
                return new List<CompetitionDto>
                {
                    new() { Id = "1", Active = ActiveStatus.Finalised, Name = "Test" }
                };
            });

        var clientProxy = new Mock<IClientProxy>(MockBehavior.Strict);
        var hubClients = new Mock<IHubClients>(MockBehavior.Strict);
        hubClients.Setup(c => c.Group(It.IsAny<string>())).Returns(clientProxy.Object);
        hubContext.Setup(h => h.Clients).Returns(hubClients.Object);
        clientProxy
            .Setup(p => p.SendCoreAsync(It.IsAny<string>(), It.IsAny<object?[]>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        using var cts = new CancellationTokenSource();
        await service.StartAsync(cts.Token);
        await Task.Delay(3500, TestContext.Current.CancellationToken);
        await cts.CancelAsync();
        await service.StopAsync(CancellationToken.None);

        apiClient.Verify(a => a.GetCompetitions(It.IsAny<CancellationToken>()), Times.AtLeast(2));
        _mockRepo.VerifyAll();
    }

    [Fact]
    public async Task ExecuteAsync_SendsCompetitionUpdate_WhenNotLive()
    {
        var (service, apiClient, hubContext) = CreateService();
        service.Subscribe("conn1", (1, 2));

        var competitions = new List<CompetitionDto>
        {
            new() { Id = "1", Active = ActiveStatus.Finalised, Name = "Test" }
        };
        apiClient.Setup(a => a.GetCompetitions(It.IsAny<CancellationToken>()))
            .ReturnsAsync(competitions);

        var clientProxy = new Mock<IClientProxy>(MockBehavior.Strict);
        var hubClients = new Mock<IHubClients>(MockBehavior.Strict);
        hubClients.Setup(c => c.Group(LeaderboardHub.GetCompetitionGroup(1, 2))).Returns(clientProxy.Object);
        hubContext.Setup(h => h.Clients).Returns(hubClients.Object);
        clientProxy
            .Setup(p => p.SendCoreAsync("ReceiveCompetitionUpdate", It.IsAny<object?[]>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        using var cts = new CancellationTokenSource();
        await service.StartAsync(cts.Token);
        await Task.Delay(1500, TestContext.Current.CancellationToken);
        await cts.CancelAsync();
        await service.StopAsync(CancellationToken.None);

        clientProxy.Verify(
            p => p.SendCoreAsync("ReceiveCompetitionUpdate", It.IsAny<object?[]>(), It.IsAny<CancellationToken>()),
            Times.AtLeastOnce);
        _mockRepo.VerifyAll();
    }
}
