using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace server.Tests.Fixtures;

/// <summary>
/// Stands in for JWT bearer validation. Emits the claims a validated token yields with
/// <c>MapInboundClaims = false</c>: <c>iss</c>, <c>sub</c> and, when given, <c>email</c>
/// (Pocket ID access tokens have none).
/// </summary>
public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "Test";
    public const string TestEmailHeader = "X-Test-Email";
    public const string TestSubjectHeader = "X-Test-Subject";
    public const string TestIssuerHeader = "X-Test-Issuer";
    public const string DefaultIssuer = "https://id.test";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    /// <summary>Subject used when a test identifies a user by email only.</summary>
    public static string SubjectFor(string email) => $"sub-{email}";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var email = Request.Headers[TestEmailHeader].FirstOrDefault();
        var subject = Request.Headers[TestSubjectHeader].FirstOrDefault()
            ?? (string.IsNullOrEmpty(email) ? null : SubjectFor(email));
        var issuer = Request.Headers[TestIssuerHeader].FirstOrDefault() ?? DefaultIssuer;

        if (string.IsNullOrEmpty(subject))
        {
            return Task.FromResult(AuthenticateResult.Fail("No test identity header"));
        }

        var claims = new List<Claim> { new("iss", issuer, null, issuer), new("sub", subject, null, issuer) };
        if (!string.IsNullOrEmpty(email))
        {
            claims.Add(new Claim("email", email, null, issuer));
        }

        var identity = new ClaimsIdentity(claims, SchemeName, "sub", null);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
