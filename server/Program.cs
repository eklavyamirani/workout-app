using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using server.Data;
using server.Endpoints;
using server.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Database
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("ConnectionStrings:Default is required");
var db = new AppDb(connectionString);
builder.Services.AddSingleton(db);

// Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Auth:Issuer"];
        options.Audience = builder.Configuration["Auth:ClientId"];
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            NameClaimType = "email"
        };
    });

builder.Services.AddAuthorization();

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
            ?? new[] { "http://localhost:4173", "http://localhost:5173" };
        policy.WithOrigins(origins)
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Initialize database schema
await db.InitializeAsync();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// User resolver middleware — only for /api/sync routes
app.UseWhen(
    context => context.Request.Path.StartsWithSegments("/api/sync"),
    appBuilder => appBuilder.UseMiddleware<UserResolverMiddleware>()
);

// Health check
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }));

// Sync endpoints
app.MapSyncEndpoints();

app.Run();

// Make Program class accessible for WebApplicationFactory in tests
public partial class Program { }
