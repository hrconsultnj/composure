# Shipyard CI/CD References -- Index

> **Barrel index.** Load docs based on detected CI platform and infrastructure from project config or filesystem detection.

## Always Load

| File | Contains |
|------|----------|
| [general/deployment-principles.md](general/deployment-principles.md) | Universal deployment pipeline, zero-downtime strategies, secrets, rollbacks, monitoring |

## Load by CI Platform / Infrastructure

| Detected | Load | Contains |
|----------|------|----------|
| `.github/workflows/` | [github-actions/patterns.md](github-actions/patterns.md) | Workflow syntax, caching, matrix, secrets, reusable workflows, common pipelines |
| `Dockerfile` or `docker-compose.yml` | [docker/best-practices.md](docker/best-practices.md) | Multi-stage builds, security hardening, Compose patterns, image optimization |

**Load ONLY what matches the detected infrastructure.** Don't load Docker docs for a Vercel-only project with no containers.

## Template Index

Templates live in `templates/` and are used by the `/shipyard:ci-generate` skill to scaffold CI configs.

| Template | Use When |
|----------|----------|
| `github-actions/nextjs-vercel.yml` | Next.js project deploying to Vercel |
| `github-actions/node-generic.yml` | Node.js project, no framework-specific deployment |
| `github-actions/python-fastapi.yml` | Python project with FastAPI |
| `github-actions/monorepo-turbo.yml` | Turborepo monorepo with multiple packages |
| `dockerfiles/nextjs.Dockerfile` | Containerized Next.js with standalone output |
| `dockerfiles/python.Dockerfile` | Containerized Python/FastAPI |
| `dockerfiles/go.Dockerfile` | Containerized Go service |
