using System.Text.Json;
using Npgsql;
using NpgsqlTypes;
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

        foreach (var change in request.Changes)
        {
            var result = await ProcessPushChange(conn, user.Id, change);
            results.Add(result);
        }

        return Results.Ok(new PushResponse
        {
            Results = results,
            ServerTime = DateTime.UtcNow.ToString("o")
        });
    }

    private static async Task<PushResultItem> ProcessPushChange(
        NpgsqlConnection conn, Guid userId, SyncChange change)
    {
        if (change.Version == 0)
        {
            // New key — try insert
            return await TryInsert(conn, userId, change);
        }
        else
        {
            // Existing key — try update with version check
            return await TryUpdate(conn, userId, change);
        }
    }

    private static async Task<PushResultItem> TryInsert(
        NpgsqlConnection conn, Guid userId, SyncChange change)
    {
        var valueJson = change.Value.GetRawText();

        // Use ON CONFLICT to handle race conditions where the key already exists
        await using var cmd = new NpgsqlCommand(@"
            INSERT INTO user_data (user_id, key, value, version, updated_at, deleted)
            VALUES (@userId, @key, @value::jsonb, 1, @updatedAt, @deleted)
            ON CONFLICT (user_id, key) DO NOTHING
            RETURNING version", conn);

        cmd.Parameters.AddWithValue("userId", userId);
        cmd.Parameters.AddWithValue("key", change.Key);
        cmd.Parameters.AddWithValue("value", valueJson);
        cmd.Parameters.AddWithValue("updatedAt", DateTime.Parse(change.UpdatedAt).ToUniversalTime());
        cmd.Parameters.AddWithValue("deleted", change.Deleted);

        var result = await cmd.ExecuteScalarAsync();
        if (result is int version)
        {
            return new PushResultItem { Key = change.Key, Status = "ok", Version = version };
        }

        // Key already exists — return conflict with current value
        return await GetConflictResult(conn, userId, change.Key);
    }

    private static async Task<PushResultItem> TryUpdate(
        NpgsqlConnection conn, Guid userId, SyncChange change)
    {
        var valueJson = change.Value.GetRawText();

        await using var cmd = new NpgsqlCommand(@"
            UPDATE user_data
            SET value = @value::jsonb,
                version = version + 1,
                updated_at = @updatedAt,
                deleted = @deleted
            WHERE user_id = @userId AND key = @key AND version = @expectedVersion
            RETURNING version", conn);

        cmd.Parameters.AddWithValue("userId", userId);
        cmd.Parameters.AddWithValue("key", change.Key);
        cmd.Parameters.AddWithValue("value", valueJson);
        cmd.Parameters.AddWithValue("updatedAt", DateTime.Parse(change.UpdatedAt).ToUniversalTime());
        cmd.Parameters.AddWithValue("deleted", change.Deleted);
        cmd.Parameters.AddWithValue("expectedVersion", change.Version);

        var result = await cmd.ExecuteScalarAsync();
        if (result is int newVersion)
        {
            return new PushResultItem { Key = change.Key, Status = "ok", Version = newVersion };
        }

        // Version mismatch — return conflict
        return await GetConflictResult(conn, userId, change.Key);
    }

    private static async Task<PushResultItem> GetConflictResult(
        NpgsqlConnection conn, Guid userId, string key)
    {
        await using var cmd = new NpgsqlCommand(@"
            SELECT value, version FROM user_data
            WHERE user_id = @userId AND key = @key", conn);

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

        var sinceDate = DateTime.MinValue.ToUniversalTime();
        if (!string.IsNullOrEmpty(since) && DateTime.TryParse(since, out var parsed))
        {
            sinceDate = parsed.ToUniversalTime();
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
