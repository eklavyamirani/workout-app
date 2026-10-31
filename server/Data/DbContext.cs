using Npgsql;

namespace server.Data;

public class AppDb
{
    private readonly string _connectionString;

    public AppDb(string connectionString)
    {
        _connectionString = connectionString;
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
}
