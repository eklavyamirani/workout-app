using System.Security.Cryptography;
using Npgsql;

namespace server.Tests.Fixtures;

/// <summary>
/// Plays the platform's part (design §5, §5.1): one database per environment owned by a
/// NOSUPERUSER/NOCREATEROLE role, plus a separate NOBYPASSRLS runtime role
/// (<c>runtime_role = true</c>). Roles are never created by the app itself.
/// </summary>
public sealed record PlatformDatabase(
    string Database, string OwnerRole, string OwnerPassword, string RuntimeRole, string RuntimePassword)
{
    public const string PostgresImage = "postgres:18.6-alpine";

    public static PlatformDatabase Create(string database) => new(
        database,
        $"{database}",
        Convert.ToHexString(RandomNumberGenerator.GetBytes(24)),
        $"{database}_rt",
        Convert.ToHexString(RandomNumberGenerator.GetBytes(24)));

    public async Task ProvisionAsync(string superuserConnectionString)
    {
        await using var conn = new NpgsqlConnection(superuserConnectionString);
        await conn.OpenAsync();

        // Test-only bootstrap with generated names: quoted via format(%I/%L) server-side.
        string[] statements =
        [
            "SELECT format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS', @owner, @ownerPw)",
            "SELECT format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS', @rt, @rtPw)",
            "SELECT format('CREATE DATABASE %I OWNER %I', @db, @owner)",
            "SELECT format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC', @db)",
            "SELECT format('GRANT CONNECT ON DATABASE %I TO %I', @db, @rt)",
        ];
        foreach (var format in statements)
        {
            await using var formatCmd = new NpgsqlCommand(format, conn);
            formatCmd.Parameters.AddWithValue("owner", OwnerRole);
            formatCmd.Parameters.AddWithValue("ownerPw", OwnerPassword);
            formatCmd.Parameters.AddWithValue("rt", RuntimeRole);
            formatCmd.Parameters.AddWithValue("rtPw", RuntimePassword);
            formatCmd.Parameters.AddWithValue("db", Database);
            var statement = (string)(await formatCmd.ExecuteScalarAsync())!;
            await using var cmd = new NpgsqlCommand(statement, conn);
            await cmd.ExecuteNonQueryAsync();
        }
    }

    public string OwnerConnectionString(string superuserConnectionString) =>
        new NpgsqlConnectionStringBuilder(superuserConnectionString)
        {
            Database = Database, Username = OwnerRole, Password = OwnerPassword
        }.ConnectionString;

    public string RuntimeConnectionString(string superuserConnectionString) =>
        new NpgsqlConnectionStringBuilder(superuserConnectionString)
        {
            Database = Database, Username = RuntimeRole, Password = RuntimePassword
        }.ConnectionString;
}
