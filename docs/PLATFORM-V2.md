# Deploying to platform v2

Platform v2 (eklavyamirani/app-platform, `docs/v2/`) is a GitOps platform on
K3s (Argo CD, CloudNativePG, Pocket ID). This branch adds what it needs and
keeps the current platform (v1, `platform.toml`) working until cutover.

What platform v2 uses from this repository, unchanged:
- `server/Dockerfile` (API, port 5000, `/api/health`, `--migrate`, `--seed fixture`)
- `deploy/Dockerfile` (nginx SPA, port 4173, mounted `/runtime-config.json`,
  non-root, read-only root filesystem)
- `server/Data/Seed/fixture.sql` (preview seed data)
- Runtime contract v1 env: `DATABASE_URL`, `DATABASE_RUNTIME_ROLE`,
  `OIDC_ISSUER`, `OIDC_AUDIENCE`, `PLATFORM_CA_FILE`, `PORT`

Added on this branch:
- `.github/workflows/platform-v2-images.yml`: builds both images on pushes
  to `main` and on same-repo pull requests labelled `preview`, pushes them to
  the platform's ACR tagged by commit SHA (Azure OIDC federation).

The Kubernetes manifests (Helm chart) live in the platform repo
(`gitops/apps/workout/chart`), so the app repo stays platform-neutral.
Production releases are promoted with `scripts/promote <target> workout <sha>`
in the platform repo; pull requests labelled `preview` get
`https://workout-pr-<n>.<platform domain>` automatically.
