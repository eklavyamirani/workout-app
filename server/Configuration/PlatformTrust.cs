using System.Net.Security;
using System.Security.Cryptography.X509Certificates;

namespace server.Configuration;

/// <summary>
/// Trust for outbound HTTPS to platform hosts. The IdP is served at
/// <c>https://id.plat.test</c> with a certificate from the platform CA, which the platform
/// mounts and names in <c>PLATFORM_CA_FILE</c> (runtime contract v1, design §6b.1). The API
/// fetches the IdP's discovery document and JWKS through a handler that trusts exactly the
/// certificates in that bundle, instead of relying on how the base image's OpenSSL reads
/// <c>SSL_CERT_FILE</c>.
/// </summary>
public static class PlatformTrust
{
    public static HttpMessageHandler CreateHandler(string caBundlePath)
    {
        var roots = new X509Certificate2Collection();
        roots.ImportFromPemFile(caBundlePath);
        if (roots.Count == 0)
        {
            throw new InvalidOperationException($"No certificates found in CA bundle '{caBundlePath}'");
        }

        var policy = new X509ChainPolicy
        {
            TrustMode = X509ChainTrustMode.CustomRootTrust,
            // The platform CA publishes no CRL/OCSP endpoint.
            RevocationMode = X509RevocationMode.NoCheck,
        };
        policy.CustomTrustStore.AddRange(roots);

        return new SocketsHttpHandler
        {
            SslOptions = new SslClientAuthenticationOptions { CertificateChainPolicy = policy },
        };
    }
}
