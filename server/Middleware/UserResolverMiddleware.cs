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

        // Find or create user (autocommit, before the user scope: 'users' has no RLS)
        var userId = await FindOrCreateUser(conn, email);

        // The whole request runs in one transaction carrying the RLS user id (see UserScope).
        // Endpoints that write commit it before responding; anything left uncommitted is
        // rolled back when the transaction is disposed.
        await using var transaction = await UserScope.BeginAsync(conn, userId);

        context.Items["User"] = new UserInfo(userId, email);
        context.Items["DbConnection"] = conn;
        context.Items["DbTransaction"] = transaction;

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
