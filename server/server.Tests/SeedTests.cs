using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using Npgsql;
using server.Data;
using server.Models;
using server.Tests.Fixtures;

namespace server.Tests;

/// <summary>Preview seed scripts (platform design §5.2): fixture load and sanitize.</summary>
public class SeedTests : IClassFixture<AppFactory>
{
    private static readonly Guid FixtureLifter = Guid.Parse("00000000-0000-4000-8000-00000000f001");
    private static readonly Guid FixtureDancer = Guid.Parse("00000000-0000-4000-8000-00000000f002");

    private readonly AppFactory _factory;

    public SeedTests(AppFactory factory)
    {
        _factory = factory;
    }

    /// <summary>All of one user's rows, read as the API reads them (runtime role, RLS scope).</summary>
    private async Task<Dictionary<string, JsonElement>> ReadUserDataAsync(Guid userId)
    {
        await using var conn = new NpgsqlConnection(_factory.ConnectionString);
        await conn.OpenAsync();
        await using var tx = await UserScope.BeginAsync(conn, userId);
        await using var cmd = new NpgsqlCommand("SELECT key, value::text FROM user_data", conn, tx);
        var rows = new Dictionary<string, JsonElement>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            rows[reader.GetString(0)] = JsonDocument.Parse(reader.GetString(1)).RootElement.Clone();
        }
        return rows;
    }

    private async Task<(string? Issuer, string? Subject, string? Email)> ReadUserAsync(Guid userId)
    {
        await using var conn = new NpgsqlConnection(_factory.OwnerConnectionString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand("SELECT issuer, subject, email FROM users WHERE id = @id", conn);
        cmd.Parameters.AddWithValue("id", userId);
        await using var reader = await cmd.ExecuteReaderAsync();
        Assert.True(await reader.ReadAsync());
        return (reader.IsDBNull(0) ? null : reader.GetString(0),
                reader.IsDBNull(1) ? null : reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetString(2));
    }

    [Fact]
    public async Task Fixture_IsIdempotent_AndInternallyConsistent()
    {
        await Seeder.RunAsync(_factory.OwnerConnectionString, "fixture");
        var first = await ReadUserDataAsync(FixtureLifter);
        await Seeder.RunAsync(_factory.OwnerConnectionString, "fixture");
        Assert.Equal(first.Count, (await ReadUserDataAsync(FixtureLifter)).Count);

        foreach (var user in new[] { FixtureLifter, FixtureDancer })
        {
            var rows = await ReadUserDataAsync(user);
            var programIds = rows["programs:list"].EnumerateArray().Select(p => p.GetString()!).ToList();
            Assert.NotEmpty(programIds);

            foreach (var programId in programIds)
            {
                Assert.Equal(programId, rows[$"programs:{programId}"].GetProperty("id").GetString());
                var activityIds = rows[$"activities:{programId}"].EnumerateArray()
                    .Select(a => a.GetProperty("id").GetString()).ToHashSet();

                var sessions = rows.Where(r => r.Key.StartsWith("sessions:") && r.Key.EndsWith($":{programId}")).ToList();
                Assert.NotEmpty(sessions);
                foreach (var (key, session) in sessions)
                {
                    Assert.Equal($"sessions:{session.GetProperty("date").GetString()}:{programId}", key);
                    foreach (var log in session.GetProperty("activities").EnumerateArray())
                    {
                        Assert.Contains(log.GetProperty("activityId").GetString(), activityIds);
                    }
                }
            }
        }
    }

    [Fact]
    public async Task Sanitize_DeidentifiesRealUsers_KeepsTrainingData_AndLeavesTheFixture()
    {
        await Seeder.RunAsync(_factory.OwnerConnectionString, "fixture");

        // "Staging" data written through the API by a real identity.
        var client = _factory.CreateClientForIdentity("https://id.plat.test", "real-person", "real.person@example.com");
        var now = DateTime.UtcNow.ToString("o");
        var push = await client.PostAsJsonAsync("/api/sync/push", new PushRequest
        {
            Changes =
            [
                new SyncChange
                {
                    Key = "sessions:2026-10-22:p1", UpdatedAt = now,
                    Value = JsonSerializer.SerializeToElement(new
                    {
                        id = "s", programId = "p1", date = "2026-10-22", status = "completed", duration = 45,
                        notes = "private note", practiceNext = "private plan", skipReason = "private reason",
                        activities = new object[]
                        {
                            new { activityId = "a1", trackingType = "sets-reps-weight", notes = "private activity note",
                                  sets = new[] { new { id = "x", setNumber = 1, weight = 100, reps = 5, isWarmup = false, timestamp = now } } },
                            new { activityId = "a2", trackingType = "custom",
                                  customValues = new Dictionary<string, object> { ["laps"] = 4, ["mood"] = "private text" } },
                        }
                    })
                },
                new SyncChange
                {
                    Key = "activities:p1", UpdatedAt = now,
                    Value = JsonSerializer.SerializeToElement(new[]
                    {
                        new { id = "a1", name = "Squat", programId = "p1", trackingType = "sets-reps-weight", description = "private description" }
                    })
                },
                new SyncChange
                {
                    Key = "references:a1", UpdatedAt = now,
                    Value = JsonSerializer.SerializeToElement(new
                    {
                        exerciseId = "a1", note = "private cue", youtubeLinks = new[] { "https://youtu.be/private" }, updatedAt = now
                    })
                },
            ]
        });
        push.EnsureSuccessStatusCode();

        Guid realId;
        await using (var conn = new NpgsqlConnection(_factory.OwnerConnectionString))
        {
            await conn.OpenAsync();
            await using var cmd = new NpgsqlCommand("SELECT id FROM users WHERE subject = 'real-person'", conn);
            realId = (Guid)(await cmd.ExecuteScalarAsync())!;
        }
        var fixtureBefore = await ReadUserDataAsync(FixtureDancer);

        await Seeder.RunAsync(_factory.OwnerConnectionString, "sanitize");
        await Seeder.RunAsync(_factory.OwnerConnectionString, "sanitize"); // idempotent

        // Identity is gone: the real person no longer maps to the copied data.
        var user = await ReadUserAsync(realId);
        Assert.Equal("urn:workout-app:sanitized", user.Issuer);
        Assert.Equal($"sanitized-{realId}", user.Subject);
        Assert.Null(user.Email);
        var pull = await client.GetFromJsonAsync<PullResponse>("/api/sync/pull?since=2000-01-01T00:00:00Z");
        Assert.Empty(pull!.Changes);

        // Free text is gone; training data stays.
        var rows = await ReadUserDataAsync(realId);
        var raw = string.Join("\n", rows.Values.Select(v => v.GetRawText()));
        Assert.DoesNotContain("private", raw);

        var session = rows["sessions:2026-10-22:p1"];
        Assert.Equal(45, session.GetProperty("duration").GetInt32());
        var set = session.GetProperty("activities")[0].GetProperty("sets")[0];
        Assert.Equal(100, set.GetProperty("weight").GetInt32());
        Assert.Equal(5, set.GetProperty("reps").GetInt32());
        Assert.Equal(4, session.GetProperty("activities")[1].GetProperty("customValues").GetProperty("laps").GetInt32());
        Assert.Equal("Squat", rows["activities:p1"][0].GetProperty("name").GetString());
        Assert.Equal(0, rows["references:a1"].GetProperty("youtubeLinks").GetArrayLength());

        // Synthetic fixture users are untouched.
        Assert.Equal("urn:workout-app:fixture", (await ReadUserAsync(FixtureDancer)).Issuer);
        var fixtureAfter = await ReadUserDataAsync(FixtureDancer);
        Assert.Equal(
            fixtureBefore.ToDictionary(r => r.Key, r => r.Value.GetRawText()),
            fixtureAfter.ToDictionary(r => r.Key, r => r.Value.GetRawText()));
    }

    [Theory]
    [InlineData("fixture", 0)]
    [InlineData("sanitize", 0)]
    [InlineData("not-a-script", -1)]
    public async Task SeedCommand_RunsLikeAPlatformJob(string script, int expectedExit)
    {
        var serverDll = typeof(Program).Assembly.Location;
        var startInfo = new ProcessStartInfo(Environment.GetEnvironmentVariable("DOTNET_HOST_PATH") ?? "dotnet")
        {
            WorkingDirectory = Path.GetDirectoryName(serverDll)!,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };
        startInfo.ArgumentList.Add(serverDll);
        startInfo.ArgumentList.Add("--seed");
        startInfo.ArgumentList.Add(script);
        startInfo.Environment["ConnectionStrings__Default"] = _factory.OwnerConnectionString;

        using var process = Process.Start(startInfo)!;
        var output = await process.StandardOutput.ReadToEndAsync() + await process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        if (expectedExit == 0)
        {
            Assert.True(process.ExitCode == 0, output);
        }
        else
        {
            Assert.NotEqual(0, process.ExitCode);
            Assert.Contains("Unknown seed script", output);
        }
    }
}
