using System.Net;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace server.Tests.Fixtures;

/// <summary>
/// An OIDC issuer on <c>https://localhost</c> with a certificate from a throwaway CA, standing
/// in for the platform IdP at <c>https://id.plat.test</c> (design §6a, record 0001's platform
/// CA). It serves discovery + JWKS and mints access tokens shaped like Pocket ID v2.19.1's
/// (RFC 9068: iss, sub, aud = [client id, issuer], client_id, scope — no email).
/// </summary>
public sealed class StubIdentityProvider : IAsyncDisposable
{
    private readonly RSA _signingKey = RSA.Create(2048);
    private readonly string _keyId = Guid.NewGuid().ToString("N");
    private WebApplication? _app;

    public string Issuer { get; private set; } = "";

    /// <summary>PEM file holding the CA that signed the issuer's TLS certificate.</summary>
    public string CaBundlePath { get; } = Path.Combine(Path.GetTempPath(), $"stub-idp-ca-{Guid.NewGuid():N}.pem");

    public async Task StartAsync()
    {
        var (ca, serverCert) = CreateCertificates();
        await File.WriteAllTextAsync(CaBundlePath, ca.ExportCertificatePem());

        var builder = WebApplication.CreateBuilder();
        builder.WebHost.ConfigureKestrel(kestrel =>
            kestrel.Listen(IPAddress.Loopback, 0, listen => listen.UseHttps(serverCert)));
        _app = builder.Build();

        _app.MapGet("/.well-known/openid-configuration", () => Results.Json(new Dictionary<string, object>
        {
            ["issuer"] = Issuer,
            ["jwks_uri"] = $"{Issuer}/.well-known/jwks.json",
            ["authorization_endpoint"] = $"{Issuer}/authorize",
            ["token_endpoint"] = $"{Issuer}/api/oidc/token",
            ["id_token_signing_alg_values_supported"] = new[] { "RS256" },
        }));
        _app.MapGet("/.well-known/jwks.json", () =>
        {
            var parameters = _signingKey.ExportParameters(false);
            return Results.Json(new
            {
                keys = new[]
                {
                    new Dictionary<string, string>
                    {
                        ["kty"] = "RSA", ["use"] = "sig", ["alg"] = "RS256", ["kid"] = _keyId,
                        ["n"] = Base64UrlEncoder.Encode(parameters.Modulus),
                        ["e"] = Base64UrlEncoder.Encode(parameters.Exponent),
                    }
                }
            });
        });

        await _app.StartAsync();
        var port = new Uri(_app.Urls.Single()).Port;
        Issuer = $"https://localhost:{port}";
    }

    /// <summary>An access token for <paramref name="clientId"/>, signed by this issuer unless
    /// <paramref name="signWith"/> substitutes another key.</summary>
    public string CreateAccessToken(string clientId, string subject, RSA? signWith = null, string? issuer = null)
    {
        var now = DateTime.UtcNow;
        var key = new RsaSecurityKey(signWith ?? _signingKey) { KeyId = _keyId };
        return new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = issuer ?? Issuer,
            TokenType = "at+jwt",
            IssuedAt = now,
            NotBefore = now,
            Expires = now.AddMinutes(5),
            Claims = new Dictionary<string, object>
            {
                ["sub"] = subject,
                ["aud"] = new[] { clientId, issuer ?? Issuer },
                ["client_id"] = clientId,
                ["scope"] = "openid profile email",
                ["jti"] = Guid.NewGuid().ToString(),
            },
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.RsaSha256),
        });
    }

    private static (X509Certificate2 Ca, X509Certificate2 Server) CreateCertificates()
    {
        using var caKey = RSA.Create(2048);
        var caRequest = new CertificateRequest("CN=workout-app test platform CA", caKey,
            HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        caRequest.CertificateExtensions.Add(new X509BasicConstraintsExtension(true, false, 0, true));
        caRequest.CertificateExtensions.Add(new X509KeyUsageExtension(
            X509KeyUsageFlags.KeyCertSign | X509KeyUsageFlags.CrlSign, true));
        var ca = caRequest.CreateSelfSigned(DateTimeOffset.UtcNow.AddMinutes(-10), DateTimeOffset.UtcNow.AddDays(2));

        using var serverKey = RSA.Create(2048);
        var serverRequest = new CertificateRequest("CN=localhost", serverKey,
            HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        var san = new SubjectAlternativeNameBuilder();
        san.AddDnsName("localhost");
        san.AddIpAddress(IPAddress.Loopback);
        serverRequest.CertificateExtensions.Add(san.Build());
        serverRequest.CertificateExtensions.Add(new X509EnhancedKeyUsageExtension(
            new OidCollection { new("1.3.6.1.5.5.7.3.1") }, false));
        var serial = RandomNumberGenerator.GetBytes(16);
        using var issued = serverRequest.Create(ca, DateTimeOffset.UtcNow.AddMinutes(-5), DateTimeOffset.UtcNow.AddDays(1), serial);

        // Round-trip through PKCS#12: SslStream on macOS rejects ephemeral private keys.
        var pfx = issued.CopyWithPrivateKey(serverKey).Export(X509ContentType.Pkcs12, "");
        var server = new X509Certificate2(pfx, "", X509KeyStorageFlags.Exportable);
        return (ca, server);
    }

    public async ValueTask DisposeAsync()
    {
        if (_app is not null)
        {
            await _app.DisposeAsync();
        }
        if (File.Exists(CaBundlePath))
        {
            File.Delete(CaBundlePath);
        }
        _signingKey.Dispose();
    }
}
