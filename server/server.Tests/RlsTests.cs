using System.Net.Http.Json;
using System.Text.Json;
using Npgsql;
using server.Models;
using server.Tests.Fixtures;

namespace server.Tests;

public class RlsTests : IClassFixture<AppFactory>
{
    private readonly AppFactory _factory;

    public RlsTests(AppFactory factory)
    {
        _factory = factory;
    }

    private static PushRequest MakePushRequest(params SyncChange[] changes) =>
        new() { Changes = changes.ToList() };

    private static SyncChange MakeChange(string key, object value, int version = 0) =>
        new()
        {
            Key = key,
            Value = JsonSerializer.SerializeToElement(value),
            UpdatedAt = DateTime.UtcNow.ToString("o"),
            Version = version,
            Deleted = false
        };

    [Fact]
    public async Task UserA_CannotSee_UserB_Data()
    {
        var clientA = _factory.CreateAuthenticatedClient("rls-a@test.com");
        var clientB = _factory.CreateAuthenticatedClient("rls-b@test.com");

        // User A pushes data
        await clientA.PostAsJsonAsync("/api/sync/push",
            MakePushRequest(MakeChange("test:rls-secret", new { secret = "A's data" })));

        // User B pulls — should not see A's data
        var result = await clientB.GetFromJsonAsync<PullResponse>(
            "/api/sync/pull?since=2000-01-01T00:00:00Z");

        Assert.NotNull(result);
        Assert.DoesNotContain(result.Changes, c => c.Key == "test:rls-secret");
    }

    [Fact]
    public async Task AppRole_IsNotSuperuser_And_DoesNotBypassRls()
    {
        // Force the host (and therefore schema/role bootstrap) to start.
        _ = _factory.CreateAuthenticatedClient("rls-role@test.com");

        await using var conn = new NpgsqlConnection(_factory.ConnectionString);
        await conn.OpenAsync();

        await using var roleCmd = new NpgsqlCommand(
            "SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user", conn);
        Assert.False((bool)(await roleCmd.ExecuteScalarAsync())!);
    }

    [Fact]
    public async Task Rls_Policy_Filters_Rows_Without_Explicit_Where_Clause()
    {
        var clientA = _factory.CreateAuthenticatedClient("rls-policy-a@test.com");
        var clientB = _factory.CreateAuthenticatedClient("rls-policy-b@test.com");

        await clientA.PostAsJsonAsync("/api/sync/push",
            MakePushRequest(MakeChange("test:rls-policy", new { owner = "A" })));
        await clientB.PostAsJsonAsync("/api/sync/push",
            MakePushRequest(MakeChange("test:rls-policy", new { owner = "B" })));

        await using var conn = new NpgsqlConnection(_factory.ConnectionString);
        await conn.OpenAsync();

        await using var idCmd = new NpgsqlCommand(
            "SELECT id FROM users WHERE email = @email", conn);
        idCmd.Parameters.AddWithValue("email", "rls-policy-a@test.com");
        var userAId = (Guid)(await idCmd.ExecuteScalarAsync())!;

        await using var setCmd = new NpgsqlCommand(
            "SELECT set_config('app.current_user_id', @id, false)", conn);
        setCmd.Parameters.AddWithValue("id", userAId.ToString());
        await setCmd.ExecuteNonQueryAsync();

        // Deliberately no user_id predicate: isolation must come from the RLS policy.
        await using var selectCmd = new NpgsqlCommand(
            "SELECT count(*) FROM user_data WHERE user_id <> @id", conn);
        selectCmd.Parameters.AddWithValue("id", userAId);
        Assert.Equal(0L, (long)(await selectCmd.ExecuteScalarAsync())!);

        await using var ownCmd = new NpgsqlCommand("SELECT count(*) FROM user_data", conn);
        Assert.True((long)(await ownCmd.ExecuteScalarAsync())! > 0);
    }

    [Fact]
    public async Task UserA_CannotUpdate_UserB_Data()
    {
        var clientA = _factory.CreateAuthenticatedClient("rls-update-a@test.com");
        var clientB = _factory.CreateAuthenticatedClient("rls-update-b@test.com");

        // User A pushes data
        await clientA.PostAsJsonAsync("/api/sync/push",
            MakePushRequest(MakeChange("test:rls-shared-key", new { owner = "A" })));

        // User B pushes same key — should create B's own row, not update A's
        await clientB.PostAsJsonAsync("/api/sync/push",
            MakePushRequest(MakeChange("test:rls-shared-key", new { owner = "B" })));

        // User A pulls — should still see their own data
        var resultA = await clientA.GetFromJsonAsync<PullResponse>(
            "/api/sync/pull?since=2000-01-01T00:00:00Z");
        Assert.NotNull(resultA);
        var itemA = resultA.Changes.FirstOrDefault(c => c.Key == "test:rls-shared-key");
        Assert.NotNull(itemA);
        Assert.Equal("A", itemA.Value.GetProperty("owner").GetString());

        // User B pulls — should see their own data
        var resultB = await clientB.GetFromJsonAsync<PullResponse>(
            "/api/sync/pull?since=2000-01-01T00:00:00Z");
        Assert.NotNull(resultB);
        var itemB = resultB.Changes.FirstOrDefault(c => c.Key == "test:rls-shared-key");
        Assert.NotNull(itemB);
        Assert.Equal("B", itemB.Value.GetProperty("owner").GetString());
    }
}
