using System.Net.Http.Json;
using System.Text.Json;
using Npgsql;
using server.Data;
using server.Models;
using server.Tests.Fixtures;

namespace server.Tests;

/// <summary>
/// The platform pools in transaction mode (design §5.1): a server connection moves to the next
/// client when a transaction ends. These tests run the API behind PgBouncer with a single
/// server connection, so every request and every probe below shares one backend.
/// </summary>
public class PooledConnectionTests : IClassFixture<PooledAppFactory>
{
    private readonly PooledAppFactory _factory;

    public PooledConnectionTests(PooledAppFactory factory)
    {
        _factory = factory;
    }

    private static PushRequest Push(string key, object value) => new()
    {
        Changes =
        [
            new SyncChange
            {
                Key = key,
                Value = JsonSerializer.SerializeToElement(value),
                UpdatedAt = DateTime.UtcNow.ToString("o"),
            }
        ]
    };

    /// <summary>A separate pooler client, as another pod or request would be.</summary>
    private async Task<NpgsqlConnection> OpenProbeAsync()
    {
        var builder = new NpgsqlConnectionStringBuilder(_factory.ConnectionString) { Pooling = false };
        var conn = new NpgsqlConnection(builder.ConnectionString);
        await conn.OpenAsync();
        return conn;
    }

    [Fact]
    public async Task UserContext_DoesNotLeak_ToTheNextClientOfThePooledConnection()
    {
        var client = _factory.CreateAuthenticatedClient("pool-leak@test.com");
        var response = await client.PostAsJsonAsync("/api/sync/push", Push("test:pool-leak", new { v = 1 }));
        response.EnsureSuccessStatusCode();

        await using var probe = await OpenProbeAsync();

        await using var settingCmd = new NpgsqlCommand(
            $"SELECT coalesce(current_setting('{UserScope.UserIdSetting}', true), '')", probe);
        Assert.Equal("", (string)(await settingCmd.ExecuteScalarAsync())!);

        // With no user context, RLS must show nothing, including the row just written.
        await using var countCmd = new NpgsqlCommand("SELECT count(*) FROM user_data", probe);
        Assert.Equal(0L, (long)(await countCmd.ExecuteScalarAsync())!);
    }

    [Fact]
    public async Task SequentialRequests_OnOnePooledConnection_SeeOnlyTheirOwnUser()
    {
        var clientA = _factory.CreateAuthenticatedClient("pool-seq-a@test.com");
        var clientB = _factory.CreateAuthenticatedClient("pool-seq-b@test.com");

        (await clientA.PostAsJsonAsync("/api/sync/push", Push("test:pool-a", new { owner = "A" })))
            .EnsureSuccessStatusCode();
        (await clientB.PostAsJsonAsync("/api/sync/push", Push("test:pool-b", new { owner = "B" })))
            .EnsureSuccessStatusCode();

        var pullA = await clientA.GetFromJsonAsync<PullResponse>("/api/sync/pull?since=2000-01-01T00:00:00Z");
        var pullB = await clientB.GetFromJsonAsync<PullResponse>("/api/sync/pull?since=2000-01-01T00:00:00Z");

        Assert.Contains(pullA!.Changes, c => c.Key == "test:pool-a");
        Assert.DoesNotContain(pullA.Changes, c => c.Key == "test:pool-b");
        Assert.Contains(pullB!.Changes, c => c.Key == "test:pool-b");
        Assert.DoesNotContain(pullB.Changes, c => c.Key == "test:pool-a");
    }

    [Fact]
    public async Task UserScope_EndsWithItsTransaction_OnTheSameConnection()
    {
        var clientA = _factory.CreateAuthenticatedClient("pool-scope-a@test.com");
        var clientB = _factory.CreateAuthenticatedClient("pool-scope-b@test.com");
        (await clientA.PostAsJsonAsync("/api/sync/push", Push("test:scope", new { owner = "A" })))
            .EnsureSuccessStatusCode();
        (await clientB.PostAsJsonAsync("/api/sync/push", Push("test:scope", new { owner = "B" })))
            .EnsureSuccessStatusCode();

        await using var conn = await OpenProbeAsync();
        var userA = await UserIdAsync(conn, "pool-scope-a@test.com");
        var userB = await UserIdAsync(conn, "pool-scope-b@test.com");

        foreach (var (userId, owner) in new[] { (userA, "A"), (userB, "B") })
        {
            await using (var tx = await UserScope.BeginAsync(conn, userId))
            {
                await using var cmd = new NpgsqlCommand(
                    "SELECT value->>'owner' FROM user_data WHERE key = 'test:scope'", conn, tx);
                Assert.Equal(owner, (string?)await cmd.ExecuteScalarAsync());
                await tx.CommitAsync();
            }

            await using var after = new NpgsqlCommand(
                $"SELECT coalesce(current_setting('{UserScope.UserIdSetting}', true), '')", conn);
            Assert.Equal("", (string)(await after.ExecuteScalarAsync())!);
        }
    }

    private static async Task<Guid> UserIdAsync(NpgsqlConnection conn, string email)
    {
        await using var cmd = new NpgsqlCommand("SELECT id FROM users WHERE email = @email", conn);
        cmd.Parameters.AddWithValue("email", email);
        return (Guid)(await cmd.ExecuteScalarAsync())!;
    }
}
