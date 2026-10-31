using Npgsql;

namespace server.Data;

/// <summary>
/// Preview seed scripts (platform design §5.2), run by <c>dotnet server.dll --seed &lt;name&gt;</c>
/// as the database owner after migrations: <c>fixture</c> loads synthetic data,
/// <c>sanitize</c> de-identifies a seed built from a dump of real data. Each script runs in one
/// transaction, so it is safe through the transaction pooler and leaves nothing half-applied.
/// </summary>
public static class Seeder
{
    public static readonly IReadOnlyList<string> Scripts = ["fixture", "sanitize"];

    public static async Task RunAsync(
        string ownerConnectionString, string script, CancellationToken cancellationToken = default)
    {
        if (!Scripts.Contains(script))
        {
            throw new ArgumentException(
                $"Unknown seed script '{script}'; expected one of: {string.Join(", ", Scripts)}", nameof(script));
        }

        var sql = await File.ReadAllTextAsync(ScriptPath(script), cancellationToken);

        await using var conn = new NpgsqlConnection(ownerConnectionString);
        await conn.OpenAsync(cancellationToken);
        await using var transaction = await conn.BeginTransactionAsync(cancellationToken);
        await using (var cmd = new NpgsqlCommand(sql, conn, transaction))
        {
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
        await transaction.CommitAsync(cancellationToken);
    }

    private static string ScriptPath(string script)
    {
        var relative = Path.Combine("Data", "Seed", $"{script}.sql");
        var path = Path.Combine(AppContext.BaseDirectory, relative);
        return File.Exists(path) ? path : Path.Combine(Directory.GetCurrentDirectory(), relative);
    }
}
