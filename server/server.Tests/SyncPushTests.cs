using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using server.Models;
using server.Tests.Fixtures;

namespace server.Tests;

public class SyncPushTests : IClassFixture<AppFactory>
{
    private readonly AppFactory _factory;

    public SyncPushTests(AppFactory factory)
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
    public async Task Push_NewKey_InsertsWithVersion1()
    {
        var client = _factory.CreateAuthenticatedClient("push-new@test.com");
        var request = MakePushRequest(MakeChange("test:new-1", new { foo = "bar" }));

        var response = await client.PostAsJsonAsync("/api/sync/push", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PushResponse>();
        Assert.NotNull(result);
        Assert.Single(result.Results);
        Assert.Equal("ok", result.Results[0].Status);
        Assert.Equal(1, result.Results[0].Version);
        Assert.Equal("test:new-1", result.Results[0].Key);
    }

    [Fact]
    public async Task Push_ExistingKey_IncrementsVersion()
    {
        var client = _factory.CreateAuthenticatedClient("push-increment@test.com");

        // First push — version 0 → creates at version 1
        var request1 = MakePushRequest(MakeChange("test:inc-1", new { v = 1 }));
        var response1 = await client.PostAsJsonAsync("/api/sync/push", request1);
        var result1 = await response1.Content.ReadFromJsonAsync<PushResponse>();
        Assert.Equal(1, result1!.Results[0].Version);

        // Second push — version 1 → updates to version 2
        var request2 = MakePushRequest(MakeChange("test:inc-1", new { v = 2 }, version: 1));
        var response2 = await client.PostAsJsonAsync("/api/sync/push", request2);
        var result2 = await response2.Content.ReadFromJsonAsync<PushResponse>();
        Assert.Equal("ok", result2!.Results[0].Status);
        Assert.Equal(2, result2.Results[0].Version);
    }

    [Fact]
    public async Task Push_StaleVersion_ReturnsConflict()
    {
        var client = _factory.CreateAuthenticatedClient("push-conflict@test.com");

        // v0 → v1
        await client.PostAsJsonAsync("/api/sync/push",
            MakePushRequest(MakeChange("test:conflict-1", new { v = 1 })));

        // v1 → v2
        await client.PostAsJsonAsync("/api/sync/push",
            MakePushRequest(MakeChange("test:conflict-1", new { v = 2 }, version: 1)));

        // Stale push with version 1 (server is at version 2) → conflict
        var response = await client.PostAsJsonAsync("/api/sync/push",
            MakePushRequest(MakeChange("test:conflict-1", new { v = "stale" }, version: 1)));

        var result = await response.Content.ReadFromJsonAsync<PushResponse>();
        Assert.NotNull(result);
        Assert.Equal("conflict", result.Results[0].Status);
        Assert.Equal(2, result.Results[0].Version);
        Assert.NotNull(result.Results[0].Value);
    }

    [Fact]
    public async Task Push_DeletedKey_SetsDeletedFlag()
    {
        var client = _factory.CreateAuthenticatedClient("push-delete@test.com");

        // Create key
        await client.PostAsJsonAsync("/api/sync/push",
            MakePushRequest(MakeChange("test:del-1", new { v = 1 })));

        // Delete key
        var response = await client.PostAsJsonAsync("/api/sync/push",
            MakePushRequest(MakeChange("test:del-1", new { v = 1 }, version: 1, deleted: true)));

        var result = await response.Content.ReadFromJsonAsync<PushResponse>();
        Assert.Equal("ok", result!.Results[0].Status);

        // Verify via pull that it shows as deleted
        var pullResponse = await client.GetFromJsonAsync<PullResponse>(
            "/api/sync/pull?since=2000-01-01T00:00:00Z");
        var deletedItem = pullResponse!.Changes.FirstOrDefault(c => c.Key == "test:del-1");
        Assert.NotNull(deletedItem);
        Assert.True(deletedItem.Deleted);
    }

    [Fact]
    public async Task Push_BatchMultipleKeys_AllProcessed()
    {
        var client = _factory.CreateAuthenticatedClient("push-batch@test.com");

        var request = MakePushRequest(
            MakeChange("test:batch-1", new { a = 1 }),
            MakeChange("test:batch-2", new { b = 2 }),
            MakeChange("test:batch-3", new { c = 3 })
        );

        var response = await client.PostAsJsonAsync("/api/sync/push", request);

        var result = await response.Content.ReadFromJsonAsync<PushResponse>();
        Assert.NotNull(result);
        Assert.Equal(3, result.Results.Count);
        Assert.All(result.Results, r =>
        {
            Assert.Equal("ok", r.Status);
            Assert.Equal(1, r.Version);
        });
    }
}
