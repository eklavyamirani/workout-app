# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src
COPY api/WorkoutApp.sln api/Directory.Build.props ./api/
COPY api/WorkoutApp.Api/WorkoutApp.Api.csproj ./api/WorkoutApp.Api/
COPY api/WorkoutApp.Api.Tests/WorkoutApp.Api.Tests.csproj ./api/WorkoutApp.Api.Tests/
RUN dotnet restore ./api/WorkoutApp.sln
COPY api ./api
RUN dotnet publish ./api/WorkoutApp.Api/WorkoutApp.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://0.0.0.0:5000
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:5000/api/health || exit 1
USER app
STOPSIGNAL SIGTERM
ENTRYPOINT ["dotnet", "WorkoutApp.Api.dll"]
