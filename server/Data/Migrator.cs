using Npgsql;

namespace server.Data;

/// <summary>
/// Applies <c>Data/Schema.sql</c>. Run as the database owner by <c>dotnet server.dll --migrate</c>
/// (the platform's migration job, design §6b.1); the API itself never changes the schema.
///
/// Roles are platform-owned (§5.1): the schema never creates or alters roles. When the platform
/// provides a separate runtime role (<c>runtime_role = true</c>), its name arrives as
/// <c>DATABASE_RUNTIME_ROLE</c> and the schema grants it what the API needs.
/// </summary>
public static class Migrator
{
    /// <summary>Transaction-local setting through which Schema.sql reads the grantee.</summary>
    public const string RuntimeRoleSetting = "workout.runtime_role";

    // Arbitrary constant: serialises concurrent migration jobs for this database.
    private const long MigrationLockKey = 0x776f726b6f7574; // "workout"

    public static async Task RunAsync(
        string ownerConnectionString, string? runtimeRole, CancellationToken cancellationToken = default)
    {
        var sql = await File.ReadAllTextAsync(SchemaPath(), cancellationToken);

        await using var conn = new NpgsqlConnection(ownerConnectionString);
        await conn.OpenAsync(cancellationToken);

        // One transaction for the whole migration: the platform runs it through a
        // transaction-mode pooler, so nothing may depend on session state (§6b.1). The
        // advisory lock is transaction-scoped for the same reason.
        await using var transaction = await conn.BeginTransactionAsync(cancellationToken);

        await using (var lockCmd = new NpgsqlCommand("SELECT pg_advisory_xact_lock(@key)", conn, transaction))
        {
            lockCmd.Parameters.AddWithValue("key", MigrationLockKey);
            await lockCmd.ExecuteNonQueryAsync(cancellationToken);
        }

        // Identifiers cannot be bind parameters; Schema.sql quotes the name with format('%I').
        await using (var roleCmd = new NpgsqlCommand(
            $"SELECT set_config('{RuntimeRoleSetting}', @role, true)", conn, transaction))
        {
            roleCmd.Parameters.AddWithValue("role", runtimeRole ?? string.Empty);
            await roleCmd.ExecuteNonQueryAsync(cancellationToken);
        }

        await using (var schemaCmd = new NpgsqlCommand(sql, conn, transaction))
        {
            await schemaCmd.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
    }

    private static string SchemaPath()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Data", "Schema.sql");
        return File.Exists(path) ? path : Path.Combine(Directory.GetCurrentDirectory(), "Data", "Schema.sql");
    }
}
