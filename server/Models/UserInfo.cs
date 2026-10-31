namespace server.Models;

/// <summary>The signed-in user: identified by (Issuer, Subject); Email is informational and may be null.</summary>
public record UserInfo(Guid Id, string Issuer, string Subject, string? Email);
