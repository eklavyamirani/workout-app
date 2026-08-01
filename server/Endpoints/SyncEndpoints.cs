using System.Globalization;
using System.Text.Json;
using Npgsql;
using server.Models;

namespace server.Endpoints;

public static class SyncEndpoints
{
    public static void MapSyncEndpoints(this WebApplication app)
    {
        var sync = app.MapGroup("/api/sync").RequireAuthorization();

        sync.MapPost("/push", HandlePush);
        sync.MapGet("/pull", HandlePull);
    }

    private static async Task<IResult> HandlePush(HttpContext context, PushRequest request)
    {
        var user = context.Items["User"] as UserInfo;
        if (user is null) return Results.Unauthorized();

        var conn = context.Items["DbConnection"] as NpgsqlConnection;
        if (conn is null) return Results.StatusCode(500);

        var results = new List<PushResultItem>();

        // The whole batch is applied atomically so a malformed item cannot leave the
        // client unable to tell which of its changes were persisted.
        await using var transaction = await conn.BeginTransactionAsync();

        foreach (var change in request.Changes)
        {
            var result = await ProcessPushChange(conn, transaction, user.Id, change);
            results.Add(result);
        }

        await transaction.CommitAsync();

        return Results.Ok(new PushResponse
        {
            Results = results,
            ServerTime = DateTime.UtcNow.ToString("o")
        });
    }

    private static async Task<PushResultItem> ProcessPushChange(
        NpgsqlConnection conn, NpgsqlTransaction transaction, Guid userId, SyncChange change)
    {
        if (string.IsNullOrEmpty(change.Key))
        {
            return new PushResultItem { Key = change.Key ?? string.Empty, Status = "error", Version = 0 };
        }

        // The client clock is untrusted input: reject unparsable values for this item
        // instead of throwing and failing the whole request.
        if (!TryParseClientTimestamp(change.UpdatedAt, out var clientUpdatedAt))
        {
            return new PushResultItem { Key = change.Key, Status = "error", Version = change.Version };
        }

        if (change.Version == 0)
        {
            // New key — try insert
            return await TryInsert(conn, transaction, userId, change, clientUpdatedAt);
        }
        else
        {
            // Existing key — try update with version check
            return await TryUpdate(conn, transaction, userId, change, clientUpdatedAt);
        }
    }

    private static bool TryParseClientTimestamp(string? value, out DateTime parsed)
    {
        parsed = default;
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        if (!DateTime.TryParse(
                value,
                CultureInfo.InvariantCulture,
                DateTimeStyles.RoundtripKind,
                out var result))
        {
            return false;
        }

        parsed = result.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(result, DateTimeKind.Utc)
            : result.ToUniversalTime();
        return true;
    }

    private static async Task<PushResultItem> TryInsert(
        NpgsqlConnection conn, NpgsqlTransaction transaction, Guid userId, SyncChange change,
        DateTime clientUpdatedAt)
    {
        var valueJson = change.Value.GetRawText();

        // updated_at is assigned server-side (now()) so that a client with a skewed or
        // stale clock cannot write a row behind another device's pull watermark.
        // Use ON CONFLICT to handle race conditions where the key already exists
        await using var cmd = new NpgsqlCommand(@"
            INSERT INTO user_data (user_id, key, value, version, updated_at, client_updated_at, deleted)
            VALUES (@userId, @key, @value::jsonb, 1, now(), @clientUpdatedAt, @deleted)
            ON CONFLICT (user_id, key) DO NOTHING
            RETURNING version", conn, transaction);

        cmd.Parameters.AddWithValue("userId", userId);
        cmd.Parameters.AddWithValue("key", change.Key);
        cmd.Parameters.AddWithValue("value", valueJson);
        cmd.Parameters.AddWithValue("clientUpdatedAt", clientUpdatedAt);
        cmd.Parameters.AddWithValue("deleted", change.Deleted);

        var result = await cmd.ExecuteScalarAsync();
        if (result is int version)
        {
            return new PushResultItem { Key = change.Key, Status = "ok", Version = version };
        }

        // Key already exists — return conflict with current value
        return await GetConflictResult(conn, transaction, userId, change.Key);
    }

    private static async Task<PushResultItem> TryUpdate(
        NpgsqlConnection conn, NpgsqlTransaction transaction, Guid userId, SyncChange change,
        DateTime clientUpdatedAt)
    {
        var valueJson = change.Value.GetRawText();

        await using var cmd = new NpgsqlCommand(@"
            UPDATE user_data
            SET value = @value::jsonb,
                version = version + 1,
                updated_at = now(),
                client_updated_at = @clientUpdatedAt,
                deleted = @deleted
            WHERE user_id = @userId AND key = @key AND version = @expectedVersion
            RETURNING version", conn, transaction);

        cmd.Parameters.AddWithValue("userId", userId);
        cmd.Parameters.AddWithValue("key", change.Key);
        cmd.Parameters.AddWithValue("value", valueJson);
        cmd.Parameters.AddWithValue("clientUpdatedAt", clientUpdatedAt);
        cmd.Parameters.AddWithValue("deleted", change.Deleted);
        cmd.Parameters.AddWithValue("expectedVersion", change.Version);

        var result = await cmd.ExecuteScalarAsync();
        if (result is int newVersion)
        {
            return new PushResultItem { Key = change.Key, Status = "ok", Version = newVersion };
        }

        // Version mismatch — return conflict
        return await GetConflictResult(conn, transaction, userId, change.Key);
    }

    private static async Task<PushResultItem> GetConflictResult(
        NpgsqlConnection conn, NpgsqlTransaction transaction, Guid userId, string key)
    {
        await using var cmd = new NpgsqlCommand(@"
            SELECT value, version FROM user_data
            WHERE user_id = @userId AND key = @key", conn, transaction);

        cmd.Parameters.AddWithValue("userId", userId);
        cmd.Parameters.AddWithValue("key", key);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            var valueJson = reader.GetString(0);
            var currentVersion = reader.GetInt32(1);
            return new PushResultItem
            {
                Key = key,
                Status = "conflict",
                Version = currentVersion,
                Value = JsonDocument.Parse(valueJson).RootElement
            };
        }

        // Key doesn't exist at all — shouldn't happen but handle gracefully
        return new PushResultItem { Key = key, Status = "error", Version = 0 };
    }

    private static async Task<IResult> HandlePull(HttpContext context, string? since)
    {
        var user = context.Items["User"] as UserInfo;
        if (user is null) return Results.Unauthorized();

        var conn = context.Items["DbConnection"] as NpgsqlConnection;
        if (conn is null) return Results.StatusCode(500);

        var sinceDate = DateTime.SpecifyKind(DateTime.MinValue, DateTimeKind.Utc);
        if (!string.IsNullOrEmpty(since))
        {
            if (!TryParseClientTimestamp(since, out var parsed))
            {
                return Results.BadRequest(new { error = "Invalid 'since' timestamp" });
            }
            sinceDate = parsed;
        }

        await using var cmd = new NpgsqlCommand(@"
            SELECT key, value, version, updated_at, deleted
            FROM user_data
            WHERE user_id = @userId AND updated_at > @since
            ORDER BY updated_at ASC", conn);

        cmd.Parameters.AddWithValue("userId", user.Id);
        cmd.Parameters.AddWithValue("since", sinceDate);

        var changes = new List<SyncChange>();
        await using var reader = await cmd.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            var valueJson = reader.GetString(1);
            changes.Add(new SyncChange
            {
                Key = reader.GetString(0),
                Value = JsonDocument.Parse(valueJson).RootElement,
                Version = reader.GetInt32(2),
                UpdatedAt = reader.GetDateTime(3).ToString("o"),
                Deleted = reader.GetBoolean(4)
            });
        }

        return Results.Ok(new PullResponse
        {
            Changes = changes,
            ServerTime = DateTime.UtcNow.ToString("o")
        });
    }
}
