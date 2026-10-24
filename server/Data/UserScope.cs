using Npgsql;

namespace server.Data;

/// <summary>
/// Per-request row-level-security context.
///
/// The platform connects through PgBouncer in transaction mode, so a server connection is
/// handed to another client as soon as a transaction ends. Session-level state
/// (<c>set_config(..., false)</c>, plain <c>SET</c>) would leak to whichever client gets the
/// connection next, and statements outside a transaction may land on a different server
/// connection than the one that set it. The user id is therefore set transaction-locally
/// (<c>set_config(..., true)</c>) inside the request's single transaction, and disappears
/// when that transaction commits or rolls back.
/// </summary>
public static class UserScope
{
    public const string UserIdSetting = "app.current_user_id";

    public static async Task<NpgsqlTransaction> BeginAsync(
        NpgsqlConnection conn, Guid userId, CancellationToken cancellationToken = default)
    {
        var transaction = await conn.BeginTransactionAsync(cancellationToken);
        try
        {
            await using var cmd = new NpgsqlCommand(
                $"SELECT set_config('{UserIdSetting}', @id, true)", conn, transaction);
            cmd.Parameters.AddWithValue("id", userId.ToString());
            await cmd.ExecuteNonQueryAsync(cancellationToken);
            return transaction;
        }
        catch
        {
            await transaction.DisposeAsync();
            throw;
        }
    }
}
