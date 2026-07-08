using DotNetBackend.Dto;
using DotNetBackend.Hubs;
using DotNetBackend.Sapphire;
using DotNetBackend.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace DotNetBackend.Tests;

public class LeaderboardServiceTests
{
    private readonly MockRepository _mockRepo = new(MockBehavior.Strict);

    private LeaderboardService CreateService(
        Mock<IApiClient>? apiClient = null,
        Mock<IHubContext<LeaderboardHub>>? hubContext = null,
        bool optimisePushUpdates = true) =>
              new(
            (apiClient ?? _mockRepo.Create<IApiClient>()).Object,
            (hubContext ?? _mockRepo.Create<IHubContext<LeaderboardHub>>()).Object,
            new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["LeaderboardService:OptimisePushUpdates"] = optimisePushUpdates.ToString()
                })
                .Build(),
            NullLogger<LeaderboardService>.Instance);

    [Fact]
    public void Subscribe_AddsConnectionToGroup()
    {
        var service = CreateService();

        service.Subscribe("conn1", (1, 2));

        service.ActiveGroups.Should().ContainSingle()
            .Which.Should().Be((1, 2));

        _mockRepo.VerifyAll();
    }

    [Fact]
    public void Subscribe_MultipleConnections_SameGroup_DeduplicatesActiveGroups()
    {
        var service = CreateService();

        service.Subscribe("conn1", (1, 2));
        service.Subscribe("conn2", (1, 2));

        service.ActiveGroups.Should().ContainSingle()
            .Which.Should().Be((1, 2));

        _mockRepo.VerifyAll();
    }

    [Fact]
    public void Unsubscribe_RemovesGroupFromConnection()
    {
        var service = CreateService();

        service.Subscribe("conn1", (1, 2));
        service.Unsubscribe("conn1", (1, 2));

        service.ActiveGroups.Should().BeEmpty();

        _mockRepo.VerifyAll();
    }

    [Fact]
    public void Unsubscribe_WhenOtherConnectionStillSubscribed_GroupRemainsActive()
    {
        var service = CreateService();

        service.Subscribe("conn1", (1, 2));
        service.Subscribe("conn2", (1, 2));
        service.Unsubscribe("conn1", (1, 2));

        service.ActiveGroups.Should().ContainSingle()
            .Which.Should().Be((1, 2));

        _mockRepo.VerifyAll();
    }

    [Fact]
    public void RemoveAllSubscriptions_RemovesConnection()
    {
        var service = CreateService();

        service.Subscribe("conn1", (1, 2));
        service.RemoveAllSubscriptions("conn1");

        service.ActiveGroups.Should().BeEmpty();

        _mockRepo.VerifyAll();
    }

    [Fact]
    public void RemoveAllSubscriptions_WhenOtherConnectionStillSubscribed_GroupRemainsActive()
    {
        var service = CreateService();

        service.Subscribe("conn1", (1, 2));
        service.Subscribe("conn2", (1, 2));
        service.RemoveAllSubscriptions("conn1");

        service.ActiveGroups.Should().ContainSingle()
            .Which.Should().Be((1, 2));

        _mockRepo.VerifyAll();
    }
}

public class PushChangesTests
{
    private readonly MockRepository _mockRepo = new(MockBehavior.Strict);

    private static Mock<IClientProxy> SetupGroupClient(Mock<IHubContext<LeaderboardHub>> hubContext, string groupName)
    {
        var clientProxy = new Mock<IClientProxy>(MockBehavior.Strict);
        var hubClients = new Mock<IHubClients>(MockBehavior.Strict);
        hubClients.Setup(c => c.Group(groupName)).Returns(clientProxy.Object);
        hubContext.Setup(h => h.Clients).Returns(hubClients.Object);
        return clientProxy;
    }

    private LeaderboardService CreateService(Mock<IApiClient> apiClient, Mock<IHubContext<LeaderboardHub>> hubContext, bool optimise = true) =>
        new(
            apiClient.Object,
            hubContext.Object,
            new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["LeaderboardService:OptimisePushUpdates"] = optimise.ToString()
                })
                .Build(),
            NullLogger<LeaderboardService>.Instance);

    [Fact]
    public async Task PushChanges_FirstCall_SendsFullItemList()
    {
        var apiClient = _mockRepo.Create<IApiClient>();
        var hubContext = _mockRepo.Create<IHubContext<LeaderboardHub>>();
        var groupName = LeaderboardHub.GetCompetitionGroup(1, 2);
        var items = new List<Dictionary<string, string>> { new() { ["entry"] = "1", ["pos"] = "1" } };
        var dto = new LeaderboardDto { Items = items };

        apiClient.Setup(a => a.GetLeaderboard(1, 2, CancellationToken.None)).ReturnsAsync(dto);
        var clientProxy = SetupGroupClient(hubContext, groupName);
        clientProxy
            .Setup(p => p.SendCoreAsync("ReceiveRowUpdate", It.Is<object?[]>(a => a[0] == items), CancellationToken.None))
            .Returns(Task.CompletedTask);

        var service = CreateService(apiClient, hubContext);
        await service.PushChanges((competitionId: 1, leaderboardId: 2));

        _mockRepo.VerifyAll();
    }

    [Fact]
    public async Task PushChanges_SecondCall_UnchangedRows_SendsNothing()
    {
        var apiClient = _mockRepo.Create<IApiClient>();
        var hubContext = _mockRepo.Create<IHubContext<LeaderboardHub>>();
        var groupName = LeaderboardHub.GetCompetitionGroup(1, 2);
        var items = new List<Dictionary<string, string>> { new() { ["entry"] = "1", ["pos"] = "1" } };
        var dto = new LeaderboardDto { Items = items };

        apiClient.Setup(a => a.GetLeaderboard(1, 2, CancellationToken.None)).ReturnsAsync(dto);
        var clientProxy = SetupGroupClient(hubContext, groupName);
        // Only the first call sends ReceiveRowUpdate
        clientProxy
            .Setup(p => p.SendCoreAsync("ReceiveRowUpdate", It.IsAny<object?[]>(), CancellationToken.None))
            .Returns(Task.CompletedTask);

        var service = CreateService(apiClient, hubContext);
        await service.PushChanges((competitionId: 1, leaderboardId: 2)); // first — sends full list
        await service.PushChanges((competitionId: 1, leaderboardId: 2)); // second — rows unchanged, sends nothing

        // ReceiveRowUpdate was called exactly once (first push only)
        clientProxy.Verify(
            p => p.SendCoreAsync("ReceiveRowUpdate", It.IsAny<object?[]>(), CancellationToken.None),
            Times.Once);
        _mockRepo.VerifyAll();
    }

    [Fact]
    public async Task PushChanges_SecondCall_ChangedRow_SendsChangedRow()
    {
        var apiClient = _mockRepo.Create<IApiClient>();
        var hubContext = _mockRepo.Create<IHubContext<LeaderboardHub>>();
        var groupName = LeaderboardHub.GetCompetitionGroup(1, 2);
        var first  = new LeaderboardDto { Items = [new() { ["entry"] = "1", ["pos"] = "1" }] };
        var second = new LeaderboardDto { Items = [new() { ["entry"] = "1", ["pos"] = "2" }] };

        apiClient.SetupSequence(a => a.GetLeaderboard(1, 2, CancellationToken.None))
            .ReturnsAsync(first)
            .ReturnsAsync(second);
        var clientProxy = SetupGroupClient(hubContext, groupName);
        clientProxy
            .Setup(p => p.SendCoreAsync("ReceiveRowUpdate", It.IsAny<object?[]>(), CancellationToken.None))
            .Returns(Task.CompletedTask);

        var service = CreateService(apiClient, hubContext);
        await service.PushChanges((competitionId: 1, leaderboardId: 2));
        await service.PushChanges((competitionId: 1, leaderboardId: 2));

        clientProxy.Verify(
            p => p.SendCoreAsync("ReceiveRowUpdate", It.IsAny<object?[]>(), CancellationToken.None),
            Times.Exactly(2));
        _mockRepo.VerifyAll();
    }

    [Fact]
    public async Task PushChanges_SecondCall_NewEntry_SendsNewRow()
    {
        var apiClient = _mockRepo.Create<IApiClient>();
        var hubContext = _mockRepo.Create<IHubContext<LeaderboardHub>>();
        var groupName = LeaderboardHub.GetCompetitionGroup(1, 2);
        var first  = new LeaderboardDto { Items = [new() { ["entry"] = "1", ["pos"] = "1" }] };
        var second = new LeaderboardDto { Items = [new() { ["entry"] = "1", ["pos"] = "1" }, new() { ["entry"] = "2", ["pos"] = "2" }] };

        apiClient.SetupSequence(a => a.GetLeaderboard(1, 2, CancellationToken.None))
            .ReturnsAsync(first)
            .ReturnsAsync(second);
        var clientProxy = SetupGroupClient(hubContext, groupName);
        clientProxy
            .Setup(p => p.SendCoreAsync("ReceiveRowUpdate", It.IsAny<object?[]>(), CancellationToken.None))
            .Returns(Task.CompletedTask);

        var service = CreateService(apiClient, hubContext);
        await service.PushChanges((competitionId: 1, leaderboardId: 2));
        await service.PushChanges((competitionId: 1, leaderboardId: 2));

        // First push: full list. Second push: only the new entry.
        clientProxy.Verify(
            p => p.SendCoreAsync("ReceiveRowUpdate", It.IsAny<object?[]>(), CancellationToken.None),
            Times.Exactly(2));
        _mockRepo.VerifyAll();
    }

    [Fact]
    public async Task PushChanges_RowWithoutEntryKey_IsIgnoredInDiff()
    {
        var apiClient = _mockRepo.Create<IApiClient>();
        var hubContext = _mockRepo.Create<IHubContext<LeaderboardHub>>();
        var groupName = LeaderboardHub.GetCompetitionGroup(1, 2);
        // Both snapshots contain a row without "entry" — it should never be included in diff
        var first  = new LeaderboardDto { Items = [new() { ["pos"] = "1" }] };
        var second = new LeaderboardDto { Items = [new() { ["pos"] = "2" }] };

        apiClient.SetupSequence(a => a.GetLeaderboard(1, 2, CancellationToken.None))
            .ReturnsAsync(first)
            .ReturnsAsync(second);
        var clientProxy = SetupGroupClient(hubContext, groupName);
        // Only the first full-push ReceiveRowUpdate fires
        clientProxy
            .Setup(p => p.SendCoreAsync("ReceiveRowUpdate", It.IsAny<object?[]>(), CancellationToken.None))
            .Returns(Task.CompletedTask);

        var service = CreateService(apiClient, hubContext);
        await service.PushChanges((competitionId: 1, leaderboardId: 2)); // full list (first push)
        await service.PushChanges((competitionId: 1, leaderboardId: 2)); // diff: no "entry" key → nothing sent

        clientProxy.Verify(
            p => p.SendCoreAsync("ReceiveRowUpdate", It.IsAny<object?[]>(), CancellationToken.None),
            Times.Once);
        _mockRepo.VerifyAll();
    }

    [Fact]
    public async Task PushChanges_ColumnCountChanged_SendsColumnUpdate()
    {
        var apiClient = _mockRepo.Create<IApiClient>();
        var hubContext = _mockRepo.Create<IHubContext<LeaderboardHub>>();
        var groupName = LeaderboardHub.GetCompetitionGroup(1, 2);
        var first = new LeaderboardDto
        {
            Columns = [new() { Name = "Pos", Label = "Position" }],
            Items = [new() { ["entry"] = "1", ["pos"] = "1" }]
        };
        var second = new LeaderboardDto
        {
            Columns =
            [
                new() { Name = "Pos", Label = "Position" },
                new() { Name = "Driver", Label = "Driver Name" }
            ],
            Items = [new() { ["entry"] = "1", ["pos"] = "1", ["Driver"] = "Alice" }]
        };

        apiClient.SetupSequence(a => a.GetLeaderboard(1, 2, CancellationToken.None))
            .ReturnsAsync(first)
            .ReturnsAsync(second);
        var clientProxy = SetupGroupClient(hubContext, groupName);
        clientProxy
            .Setup(p => p.SendCoreAsync("ReceiveRowUpdate", It.IsAny<object?[]>(), CancellationToken.None))
            .Returns(Task.CompletedTask);
        clientProxy
            .Setup(p => p.SendCoreAsync("ReceiveColumnUpdate", It.IsAny<object?[]>(), CancellationToken.None))
            .Returns(Task.CompletedTask);

        var service = CreateService(apiClient, hubContext);
        await service.PushChanges((competitionId: 1, leaderboardId: 2)); // first: sends columns
        await service.PushChanges((competitionId: 1, leaderboardId: 2)); // second: column count changed → sends column update

        clientProxy.Verify(
            p => p.SendCoreAsync("ReceiveColumnUpdate", It.IsAny<object?[]>(), CancellationToken.None),
            Times.Once);
        _mockRepo.VerifyAll();
    }
}
