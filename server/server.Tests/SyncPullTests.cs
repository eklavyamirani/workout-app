using System.Net.Http.Json;
using System.Text.Json;
using server.Models;
using server.Tests.Fixtures;

namespace server.Tests;

public class SyncPullTests : IClassFixture<AppFactory>
{
    private readonly AppFactory _factory;

    public SyncPullTests(AppFactory factory)
    {
        _factory = factory;
    }

    private static PushRequest MakePushRequest(params SyncChange[] changes) =>
        new() { Changes = changes.ToList() };

    private static SyncChange MakeChange(string key, object value, int version = 0, bool deleted = false) =>
        new()
        {
            Key = key,
            Value = JsonSerializer.SerializeToElement(value),
            UpdatedAt = DateTime.UtcNow.ToString("o"),
            Version = version,
            Deleted = deleted
        };

    [Fact]
    public async Task Pull_SinceEpoch_ReturnsAllRows()
    {
        var client = _factory.CreateAuthenticatedClient("pull-all@test.com");

        // Push 3 keys
        await client.PostAsJsonAsync("/api/sync/push", MakePushRequest(
            MakeChange("test:pull-a", new { a = 1 }),
            MakeChange("test:pull-b", new { b = 2 }),
            MakeChange("test:pull-c", new { c = 3 })
        ));

        var result = await client.GetFromJsonAsync<PullResponse>(
            "/api/sync/pull?since=2000-01-01T00:00:00Z");

        Assert.NotNull(result);
        Assert.Equal(3, result.Changes.Count);
        Assert.Contains(result.Changes, c => c.Key == "test:pull-a");
        Assert.Contains(result.Changes, c => c.Key == "test:pull-b");
        Assert.Contains(result.Changes, c => c.Key == "test:pull-c");
    }

    [Fact]
    public async Task Pull_SinceRecent_ReturnsOnlyNewer()
    {
        var client = _factory.CreateAuthenticatedClient("pull-recent@test.com");

        // Push first key
        await client.PostAsJsonAsync("/api/sync/push",
            MakePushRequest(MakeChange("test:old", new { old = true })));

        // Record time between pushes
        await Task.Delay(100);
        var midpoint = DateTime.UtcNow.ToString("o");
        await Task.Delay(100);

        // Push second key
        await client.PostAsJsonAsync("/api/sync/push",
            MakePushRequest(MakeChange("test:new", new { @new = true })));

        var result = await client.GetFromJsonAsync<PullResponse>(
            $"/api/sync/pull?since={midpoint}");

        Assert.NotNull(result);
        Assert.Single(result.Changes);
        Assert.Equal("test:new", result.Changes[0].Key);
    }

    [Fact]
    public async Task Pull_ReturnsServerTime()
    {
        var client = _factory.CreateAuthenticatedClient("pull-time@test.com");

        var result = await client.GetFromJsonAsync<PullResponse>(
            "/api/sync/pull?since=2000-01-01T00:00:00Z");

        Assert.NotNull(result);
        Assert.NotNull(result.ServerTime);
        Assert.True(DateTime.TryParse(result.ServerTime, out var serverTime));
        Assert.True(serverTime > DateTime.UtcNow.AddMinutes(-1));
    }

    [Fact]
    public async Task Pull_IncludesDeletedRows()
    {
        var client = _factory.CreateAuthenticatedClient("pull-deleted@test.com");

        // Create then delete
        await client.PostAsJsonAsync("/api/sync/push",
            MakePushRequest(MakeChange("test:to-delete", new { v = 1 })));
        await client.PostAsJsonAsync("/api/sync/push",
            MakePushRequest(MakeChange("test:to-delete", new { v = 1 }, version: 1, deleted: true)));

        var result = await client.GetFromJsonAsync<PullResponse>(
            "/api/sync/pull?since=2000-01-01T00:00:00Z");

        Assert.NotNull(result);
        var deletedItem = result.Changes.FirstOrDefault(c => c.Key == "test:to-delete");
        Assert.NotNull(deletedItem);
        Assert.True(deletedItem.Deleted);
    }
}
