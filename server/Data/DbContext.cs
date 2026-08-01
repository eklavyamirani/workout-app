using Npgsql;

namespace server.Data;

public class AppDb
{
    private readonly string _connectionString;
    private readonly string _adminConnectionString;
    private readonly string? _appRolePassword;

    public AppDb(string connectionString, string? adminConnectionString = null, string? appRolePassword = null)
    {
        _connectionString = connectionString;
        _adminConnectionString = string.IsNullOrWhiteSpace(adminConnectionString)
            ? connectionString
            : adminConnectionString!;
        _appRolePassword = appRolePassword;
    }

    public async Task<NpgsqlConnection> OpenConnectionAsync(CancellationToken cancellationToken = default)
    {
        var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(cancellationToken);
        return conn;
    }

    /// <summary>
    /// Verifies that the database is reachable and that the schema the API depends on exists.
    /// Never returns connection details or credentials.
    /// </summary>
    public async Task CheckAsync(CancellationToken cancellationToken = default)
    {
        await using var conn = await OpenConnectionAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(
            "SELECT 1 FROM information_schema.tables WHERE table_name = 'user_data'", conn);
        var result = await cmd.ExecuteScalarAsync(cancellationToken);
        if (result is null)
        {
            throw new InvalidOperationException("Required table 'user_data' is missing");
        }
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        await using var conn = new NpgsqlConnection(_adminConnectionString);
        await conn.OpenAsync(cancellationToken);

        var schemaPath = Path.Combine(AppContext.BaseDirectory, "Data", "Schema.sql");

        if (!File.Exists(schemaPath))
        {
            schemaPath = Path.Combine(Directory.GetCurrentDirectory(), "Data", "Schema.sql");
        }

        if (File.Exists(schemaPath))
        {
            var sql = await File.ReadAllTextAsync(schemaPath, cancellationToken);
            await using var cmd = new NpgsqlCommand(sql, conn);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }

        if (!string.IsNullOrEmpty(_appRolePassword))
        {
            await SetAppRolePasswordAsync(conn, _appRolePassword!, cancellationToken);
        }
    }

    private static async Task SetAppRolePasswordAsync(
        NpgsqlConnection conn, string password, CancellationToken cancellationToken)
    {
        // ALTER ROLE does not accept bind parameters. format(..., %L) produces a correctly
        // quoted literal server-side, so the password is never concatenated into SQL by hand.
        await using var formatCmd = new NpgsqlCommand(
            "SELECT format('ALTER ROLE workout_app WITH LOGIN PASSWORD %L', @password)", conn);
        formatCmd.Parameters.AddWithValue("password", password);
        var statement = (string)(await formatCmd.ExecuteScalarAsync(cancellationToken))!;

        await using var alterCmd = new NpgsqlCommand(statement, conn);
        await alterCmd.ExecuteNonQueryAsync(cancellationToken);
    }
}
