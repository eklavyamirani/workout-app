using Npgsql;

namespace server.Data;

public class AppDb
{
    private readonly string _connectionString;

    public AppDb(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task<NpgsqlConnection> OpenConnectionAsync()
    {
        var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();
        return conn;
    }

    public async Task InitializeAsync()
    {
        await using var conn = await OpenConnectionAsync();
        var schemaPath = Path.Combine(AppContext.BaseDirectory, "Data", "Schema.sql");

        if (!File.Exists(schemaPath))
        {
            schemaPath = Path.Combine(Directory.GetCurrentDirectory(), "Data", "Schema.sql");
        }

        if (File.Exists(schemaPath))
        {
            var sql = await File.ReadAllTextAsync(schemaPath);
            await using var cmd = new NpgsqlCommand(sql, conn);
            await cmd.ExecuteNonQueryAsync();
        }
    }
}
