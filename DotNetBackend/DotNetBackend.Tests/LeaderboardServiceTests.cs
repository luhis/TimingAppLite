using DotNetBackend.Hubs;
using DotNetBackend.Sapphire;
using DotNetBackend.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;

namespace DotNetBackend.Tests;

public class LeaderboardServiceTests
{
    private readonly MockRepository _mockRepo = new(MockBehavior.Strict);

    private LeaderboardService CreateService(
        Mock<IApiClient>? apiClient = null,
        Mock<IHubContext<LeaderboardHub>>? hubContext = null) =>
              new(
            (apiClient ?? _mockRepo.Create<IApiClient>()).Object,
            (hubContext ?? _mockRepo.Create<IHubContext<LeaderboardHub>>()).Object,
            new ConfigurationBuilder().Build());

    [Fact]
    public void Subscribe_AddsConnectionToGroup()
    {
        var service = CreateService();

        service.Subscribe("conn1", 1, 2);

        service.ActiveGroups.Should().ContainSingle()
            .Which.Should().Be((1, 2));

        _mockRepo.VerifyAll();
    }

    [Fact]
    public void Subscribe_SameConnection_MultipleGroups_TracksAll()
    {
        var service = CreateService();

        service.Subscribe("conn1", 1, 2);
        service.Subscribe("conn1", 1, 3);

        service.ActiveGroups.Should().HaveCount(2);

        _mockRepo.VerifyAll();
    }

    [Fact]
    public void Subscribe_MultipleConnections_SameGroup_DeduplicatesActiveGroups()
    {
        var service = CreateService();

        service.Subscribe("conn1", 1, 2);
        service.Subscribe("conn2", 1, 2);

        service.ActiveGroups.Should().ContainSingle()
            .Which.Should().Be((1, 2));

        _mockRepo.VerifyAll();
    }

    [Fact]
    public void Unsubscribe_RemovesGroupFromConnection()
    {
        var service = CreateService();

        service.Subscribe("conn1", 1, 2);
        service.Unsubscribe("conn1", 1, 2);

        service.ActiveGroups.Should().BeEmpty();

        _mockRepo.VerifyAll();
    }

    [Fact]
    public void Unsubscribe_WhenOtherConnectionStillSubscribed_GroupRemainsActive()
    {
        var service = CreateService();

        service.Subscribe("conn1", 1, 2);
        service.Subscribe("conn2", 1, 2);
        service.Unsubscribe("conn1", 1, 2);

        service.ActiveGroups.Should().ContainSingle()
            .Which.Should().Be((1, 2));

        _mockRepo.VerifyAll();
    }

    [Fact]
    public void RemoveAllSubscriptions_RemovesAllGroupsForConnection()
    {
        var service = CreateService();

        service.Subscribe("conn1", 1, 2);
        service.Subscribe("conn1", 1, 2);
        service.RemoveAllSubscriptions("conn1");

        service.ActiveGroups.Should().BeEmpty();

        _mockRepo.VerifyAll();
    }

    [Fact]
    public void RemoveAllSubscriptions_WhenOtherConnectionStillSubscribed_SharedGroupRemainsActive()
    {
        var service = CreateService();

        service.Subscribe("conn1", 1, 2);
        service.Subscribe("conn2", 1, 2);
        service.RemoveAllSubscriptions("conn1");

        service.ActiveGroups.Should().ContainSingle()
            .Which.Should().Be((1, 2));

        _mockRepo.VerifyAll();
    }
}
