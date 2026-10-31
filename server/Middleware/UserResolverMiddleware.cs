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
        // Identity is the token's (iss, sub). Pocket ID access tokens (RFC 9068 profile) carry no
        // email claim, and email is mutable, so it is only informational (docs/decisions/0004).
        var subjectClaim = context.User.FindFirst("sub");
        var subject = subjectClaim?.Value;
        var issuer = context.User.FindFirstValue("iss") ?? subjectClaim?.Issuer;
        var email = context.User.FindFirstValue("email");

        if (string.IsNullOrEmpty(subject) || string.IsNullOrEmpty(issuer))
        {
            context.Response.StatusCode = 401;
            return;
        }

        await using var conn = await db.OpenConnectionAsync();

        // Find or create user (autocommit, before the user scope: 'users' has no RLS)
        var userId = await FindOrCreateUser(conn, issuer, subject, email);

        // The whole request runs in one transaction carrying the RLS user id (see UserScope).
        // Endpoints that write commit it before responding; anything left uncommitted is
        // rolled back when the transaction is disposed.
        await using var transaction = await UserScope.BeginAsync(conn, userId);

        context.Items["User"] = new UserInfo(userId, issuer, subject, email);
        context.Items["DbConnection"] = conn;
        context.Items["DbTransaction"] = transaction;

        await _next(context);
    }

    private static async Task<Guid> FindOrCreateUser(
        NpgsqlConnection conn, string issuer, string subject, string? email)
    {
        await using var findCmd = new NpgsqlCommand(
            "SELECT id FROM users WHERE issuer = @issuer AND subject = @subject", conn);
        findCmd.Parameters.AddWithValue("issuer", issuer);
        findCmd.Parameters.AddWithValue("subject", subject);
        if (await findCmd.ExecuteScalarAsync() is Guid existingId)
            return existingId;

        // One-time bridge: a row created when users were keyed by email (and not yet linked to
        // an identity) is claimed by the first identity presenting that email.
        if (!string.IsNullOrEmpty(email))
        {
            await using var linkCmd = new NpgsqlCommand(
                @"UPDATE users SET issuer = @issuer, subject = @subject
                  WHERE id = (SELECT id FROM users WHERE subject IS NULL AND email = @email LIMIT 1)
                    AND subject IS NULL -- re-checked after a concurrent link: first one wins
                  RETURNING id", conn);
            linkCmd.Parameters.AddWithValue("issuer", issuer);
            linkCmd.Parameters.AddWithValue("subject", subject);
            linkCmd.Parameters.AddWithValue("email", email);
            if (await linkCmd.ExecuteScalarAsync() is Guid linkedId)
                return linkedId;
        }

        // ON CONFLICT covers two first requests racing for the same identity.
        await using var createCmd = new NpgsqlCommand(
            @"INSERT INTO users (issuer, subject, email) VALUES (@issuer, @subject, @email)
              ON CONFLICT (issuer, subject) DO UPDATE SET email = coalesce(EXCLUDED.email, users.email)
              RETURNING id", conn);
        createCmd.Parameters.AddWithValue("issuer", issuer);
        createCmd.Parameters.AddWithValue("subject", subject);
        createCmd.Parameters.AddWithValue("email", (object?)email ?? DBNull.Value);

        return (Guid)(await createCmd.ExecuteScalarAsync())!;
    }
}
