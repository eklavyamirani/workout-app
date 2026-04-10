using System.Security.Claims;
using Npgsql;
using server.Data;
using server.Models;

namespace server.Middleware;

public class UserResolverMiddleware
{
    private readonly RequestDelegate _next;

    public UserResolverMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, AppDb db)
    {
        var email = context.User.FindFirstValue("email")
                    ?? context.User.FindFirstValue(ClaimTypes.Email);

        if (string.IsNullOrEmpty(email))
        {
            context.Response.StatusCode = 401;
            return;
        }

        await using var conn = await db.OpenConnectionAsync();

        // Find or create user
        var userId = await FindOrCreateUser(conn, email);

        context.Items["User"] = new UserInfo(userId, email);
        context.Items["DbConnection"] = conn;

        // SET doesn't support parameterized queries in PostgreSQL.
        // The userId is a Guid from our own database, not user input, so string interpolation is safe.
        await using var setCmd = new NpgsqlCommand(
            $"SET LOCAL app.current_user_id = '{userId}'", conn);
        await setCmd.ExecuteNonQueryAsync();

        await _next(context);
    }

    private static async Task<Guid> FindOrCreateUser(NpgsqlConnection conn, string email)
    {
        // Try to find existing user
        await using var findCmd = new NpgsqlCommand(
            "SELECT id FROM users WHERE email = @email", conn);
        findCmd.Parameters.AddWithValue("email", email);

        var result = await findCmd.ExecuteScalarAsync();
        if (result is Guid existingId)
            return existingId;

        // Create new user
        await using var createCmd = new NpgsqlCommand(
            "INSERT INTO users (email) VALUES (@email) ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id",
            conn);
        createCmd.Parameters.AddWithValue("email", email);

        return (Guid)(await createCmd.ExecuteScalarAsync())!;
    }
}
