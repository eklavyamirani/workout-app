## syntax=docker/dockerfile:1
# API image. Cross-compiled from the build platform so multi-platform builds do not
# require emulation.
FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG TARGETARCH
WORKDIR /src
COPY server.csproj .
RUN dotnet restore -a "$TARGETARCH"
COPY . .
RUN dotnet publish -c Release -a "$TARGETARCH" --no-self-contained -o /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0

# The container runs as a numeric non-root user with a read-only root filesystem plus
# tmpfs mounts for /tmp and /app/tmp. A passwd entry is deliberately not required.
RUN mkdir -p /app/tmp && chown -R 10001:10001 /app

WORKDIR /app
COPY --from=build --chown=10001:10001 /app .

EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000 \
    DOTNET_EnableDiagnostics=0 \
    TMPDIR=/tmp

USER 10001:10001
# .NET's default console lifetime handles SIGTERM and shuts down gracefully.
STOPSIGNAL SIGTERM
ENTRYPOINT ["dotnet", "server.dll"]
