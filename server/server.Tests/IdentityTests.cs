using System.Net.Http.Json;
using System.Text.Json;
using Npgsql;
using server.Data;
using server.Models;
using server.Tests.Fixtures;

namespace server.Tests;

/// <summary>Users are keyed by (iss, sub); email is informational (docs/decisions/0004).</summary>
public class IdentityTests : IClassFixture<AppFactory>
{
    private const string Since = "/api/sync/pull?since=2000-01-01T00:00:00Z";
    private readonly AppFactory _factory;

    public IdentityTests(AppFactory factory)
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

    [Fact]
    public async Task TokenWithoutEmail_IsAUser()
    {
        var client = _factory.CreateClientForIdentity(TestAuthHandler.DefaultIssuer, "no-email-user");
        (await client.PostAsJsonAsync("/api/sync/push", Push("test:no-email", new { v = 1 }))).EnsureSuccessStatusCode();

        var pull = await client.GetFromJsonAsync<PullResponse>(Since);
        Assert.Contains(pull!.Changes, c => c.Key == "test:no-email");
    }

    [Fact]
    public async Task SameEmail_DifferentSubject_AreDifferentUsers()
    {
        var a = _factory.CreateClientForIdentity(TestAuthHandler.DefaultIssuer, "subject-a", "shared@test.com");
        var b = _factory.CreateClientForIdentity(TestAuthHandler.DefaultIssuer, "subject-b", "shared@test.com");
        (await a.PostAsJsonAsync("/api/sync/push", Push("test:shared-email", new { owner = "A" }))).EnsureSuccessStatusCode();

        var pullB = await b.GetFromJsonAsync<PullResponse>(Since);
        Assert.DoesNotContain(pullB!.Changes, c => c.Key == "test:shared-email");
    }

    [Fact]
    public async Task SameSubject_DifferentIssuer_AreDifferentUsers()
    {
        var a = _factory.CreateClientForIdentity("https://id-one.test", "same-subject");
        var b = _factory.CreateClientForIdentity("https://id-two.test", "same-subject");
        (await a.PostAsJsonAsync("/api/sync/push", Push("test:same-sub", new { owner = "A" }))).EnsureSuccessStatusCode();

        var pullB = await b.GetFromJsonAsync<PullResponse>(Since);
        Assert.DoesNotContain(pullB!.Changes, c => c.Key == "test:same-sub");
    }

    [Fact]
    public async Task LegacyEmailKeyedUser_IsLinkedToTheFirstIdentityOnly()
    {
        // A row from before (iss, sub) keying: email only, with data.
        Guid legacyId;
        await using (var conn = new NpgsqlConnection(_factory.OwnerConnectionString))
        {
            await conn.OpenAsync();
            await using var insertUser = new NpgsqlCommand(
                "INSERT INTO users (email) VALUES ('legacy@test.com') RETURNING id", conn);
            legacyId = (Guid)(await insertUser.ExecuteScalarAsync())!;

            await using var tx = await UserScope.BeginAsync(conn, legacyId);
            await using var insertData = new NpgsqlCommand(
                @"INSERT INTO user_data (user_id, key, value) VALUES (@id, 'test:legacy', '{""v"":1}')", conn, tx);
            insertData.Parameters.AddWithValue("id", legacyId);
            await insertData.ExecuteNonQueryAsync();
            await tx.CommitAsync();
        }

        var first = _factory.CreateClientForIdentity(TestAuthHandler.DefaultIssuer, "legacy-sub", "legacy@test.com");
        var firstPull = await first.GetFromJsonAsync<PullResponse>(Since);
        Assert.Contains(firstPull!.Changes, c => c.Key == "test:legacy");

        var second = _factory.CreateClientForIdentity(TestAuthHandler.DefaultIssuer, "other-sub", "legacy@test.com");
        var secondPull = await second.GetFromJsonAsync<PullResponse>(Since);
        Assert.DoesNotContain(secondPull!.Changes, c => c.Key == "test:legacy");

        await using var check = new NpgsqlConnection(_factory.OwnerConnectionString);
        await check.OpenAsync();
        await using var cmd = new NpgsqlCommand("SELECT subject FROM users WHERE id = @id", check);
        cmd.Parameters.AddWithValue("id", legacyId);
        Assert.Equal("legacy-sub", (string?)await cmd.ExecuteScalarAsync());
    }
}
