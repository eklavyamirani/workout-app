using System.Diagnostics;
using Npgsql;
using server.Data;
using server.Tests.Fixtures;

namespace server.Tests;

/// <summary>
/// Owner/runtime split (design §5.1, §6b.1): migrations run as a NOCREATEROLE owner and grant
/// to the platform-created runtime role; the runtime role cannot change the schema.
/// </summary>
public class MigrationTests : IClassFixture<AppFactory>
{
    private readonly AppFactory _factory;

    public MigrationTests(AppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Migration_IsIdempotent_AndCreatesNoRoles()
    {
        await Migrator.RunAsync(_factory.OwnerConnectionString, _factory.Database.RuntimeRole);

        await using var conn = new NpgsqlConnection(_factory.SuperuserConnectionString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            "SELECT rolname FROM pg_roles WHERE rolname !~ '^pg_' AND rolname <> current_user ORDER BY 1", conn);
        var roles = new List<string>();
        await using (var reader = await cmd.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync()) roles.Add(reader.GetString(0));
        }

        Assert.Equal(new[] { _factory.Database.OwnerRole, _factory.Database.RuntimeRole }.Order(), roles);
    }

    [Fact]
    public async Task Owner_IsNotPrivileged()
    {
        await using var conn = new NpgsqlConnection(_factory.OwnerConnectionString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            "SELECT rolsuper OR rolcreaterole OR rolcreatedb OR rolbypassrls FROM pg_roles WHERE rolname = current_user",
            conn);
        Assert.False((bool)(await cmd.ExecuteScalarAsync())!);
    }

    [Theory]
    [InlineData("ALTER TABLE user_data DISABLE ROW LEVEL SECURITY")]
    [InlineData("ALTER TABLE user_data NO FORCE ROW LEVEL SECURITY")]
    [InlineData("DROP POLICY user_data_isolation ON user_data")]
    [InlineData("DROP TABLE users")]
    [InlineData("CREATE TABLE public.sneaky (id int)")]
    public async Task RuntimeRole_CannotChangeTheSchema(string ddl)
    {
        await using var conn = new NpgsqlConnection(_factory.ConnectionString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(ddl, conn);

        var error = await Assert.ThrowsAsync<PostgresException>(() => cmd.ExecuteNonQueryAsync());
        Assert.Equal(PostgresErrorCodes.InsufficientPrivilege, error.SqlState);
    }

    [Fact]
    public async Task Migration_Fails_WhenTheRuntimeRoleDoesNotExist()
    {
        var error = await Assert.ThrowsAsync<PostgresException>(
            () => Migrator.RunAsync(_factory.OwnerConnectionString, "missing_rt"));
        Assert.Contains("missing_rt", error.MessageText);
    }

    [Fact]
    public async Task MigrateCommand_RunsLikeThePlatformJob()
    {
        // The platform runs `dotnet server.dll --migrate` in the API image with the owner role
        // and DATABASE_RUNTIME_ROLE (platform.toml [database] migrate).
        var serverDll = typeof(Program).Assembly.Location;
        var startInfo = new ProcessStartInfo(
            Environment.GetEnvironmentVariable("DOTNET_HOST_PATH") ?? "dotnet")
        {
            WorkingDirectory = Path.GetDirectoryName(serverDll)!,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };
        startInfo.ArgumentList.Add(serverDll);
        startInfo.ArgumentList.Add("--migrate");
        startInfo.Environment["ConnectionStrings__Default"] = _factory.OwnerConnectionString;
        startInfo.Environment["DATABASE_RUNTIME_ROLE"] = _factory.Database.RuntimeRole;

        using var process = Process.Start(startInfo)!;
        var stdout = await process.StandardOutput.ReadToEndAsync();
        var stderr = await process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        Assert.True(process.ExitCode == 0, $"exit {process.ExitCode}\n{stdout}\n{stderr}");
        Assert.Contains($"runtime role '{_factory.Database.RuntimeRole}' granted", stdout);
    }
}
