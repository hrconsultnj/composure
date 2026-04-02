# Docker / Compose — Architecture Patterns

## Multi-Stage Builds

Every production Dockerfile should use multi-stage builds. Separate build-time dependencies from runtime.

### Basic Pattern

```dockerfile
# syntax=docker/dockerfile:1

# Build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Non-root user
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/package.json ./

USER appuser
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Stage Naming Convention

| Stage | Purpose |
|-------|---------|
| `base` | Shared base image + system deps |
| `deps` | Production dependencies only |
| `build-deps` | All dependencies (including devDependencies) |
| `build` | Compile/bundle the application |
| `test` | Run tests (optional CI stage) |
| `production` | Final runtime image |

---

## Layer Caching

### Cache Mounts (recommended)

Use `--mount=type=cache` to cache package manager downloads across builds:

```dockerfile
# pnpm
RUN --mount=type=cache,target=/root/.local/share/pnpm/store,sharing=locked pnpm install --frozen-lockfile

# bun
RUN --mount=type=cache,target=/root/.bun/install/cache,sharing=locked bun install --frozen-lockfile

# npm
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci

# pip
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt

# go
RUN --mount=type=cache,target=/go/pkg/mod go build -o /app
```

### Layer Order

Order instructions from least-frequently to most-frequently changed:

```dockerfile
# 1. Base image (rarely changes)
FROM node:22-alpine

# 2. System dependencies (rarely changes)
RUN apk add --no-cache curl

# 3. Package files (changes when deps change)
COPY package*.json ./
RUN npm ci

# 4. Source code (changes most often)
COPY . .
RUN npm run build
```

---

## .dockerignore

Every project with a Dockerfile needs a `.dockerignore`:

```dockerignore
# Dependencies
node_modules/
.pnpm-store/

# Build output
dist/
build/
.next/

# Version control
.git/
.gitignore

# Environment
.env
.env.*
!.env.example

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Tests & docs
coverage/
*.md
!README.md

# Docker (avoid recursive context)
Dockerfile*
docker-compose*
.dockerignore
```

**Why it matters**: Without `.dockerignore`, the build context sends everything to the Docker daemon — including `node_modules/`, `.git/`, and secrets. This slows builds and risks leaking credentials.

---

## Non-Root User

**Always run containers as a non-root user in production.**

```dockerfile
# Alpine
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser

# Debian/Ubuntu
RUN useradd --create-home --shell /bin/bash --uid 1001 appuser && \
    chown -R appuser:appuser /app
USER appuser
```

Set `USER` as late as possible — after all `COPY` and `RUN` commands that need root.

---

## Docker Compose

### Service Organization

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      target: production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/myapp
    depends_on:
      db:
        condition: service_healthy
    networks:
      - backend
    restart: unless-stopped

  db:
    image: postgres:17-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: myapp
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend

volumes:
  pgdata:

networks:
  backend:
    driver: bridge
```

### Key Patterns

| Pattern | Why |
|---------|-----|
| **`depends_on` with `condition: service_healthy`** | Don't start app until DB is actually ready, not just started |
| **Named volumes** | Persist data across container restarts. Don't use bind mounts for databases. |
| **Custom networks** | Isolate service communication. Services on the same network can reach each other by name. |
| **`restart: unless-stopped`** | Auto-restart on crash but not when manually stopped |
| **Health checks** | Required for `depends_on` conditions and orchestrator integration |

### Environment Variables

```yaml
# Option 1: Inline (simple values, non-secrets)
environment:
  - NODE_ENV=production
  - LOG_LEVEL=info

# Option 2: env_file (secrets, many variables)
env_file:
  - .env

# Option 3: Compose interpolation (reference host env)
environment:
  - DATABASE_URL=${DATABASE_URL}
```

**Never commit `.env` files with secrets.** Use `.env.example` with placeholder values.

### Override Files

```
docker-compose.yml            ← Base config (production-like)
docker-compose.override.yml   ← Dev overrides (auto-loaded by `docker compose up`)
docker-compose.test.yml       ← Test overrides (`docker compose -f ... -f ... up`)
```

---

## Minimal Base Images

| Base | Size | When to use |
|------|------|------------|
| `alpine` | ~5MB | Default choice. Minimal, secure. |
| `slim` (Debian) | ~80MB | When Alpine's musl libc causes issues (Python wheels, native deps) |
| `distroless` | ~2-20MB | Maximum security. No shell, no package manager. |
| `scratch` | 0MB | Static binaries only (Go, Rust) |

Prefer `alpine` variants: `node:22-alpine`, `python:3.12-alpine`, `golang:1.23-alpine`.

---

## Anti-Patterns

### ❌ Images
- Using `latest` tag (non-deterministic builds)
- Not pinning base image versions (`FROM node` instead of `FROM node:22-alpine`)
- Large base images when alpine works
- Not cleaning up in the same `RUN` layer (`apt-get install && apt-get clean` in one `RUN`)

### ❌ Security
- Running as root (no `USER` instruction)
- Copying secrets into the image (use build secrets or runtime env vars)
- No `.dockerignore` (leaking `.git/`, `.env`, `node_modules/`)
- Exposing unnecessary ports

### ❌ Build Efficiency
- Copying source before installing dependencies (breaks layer cache)
- Not using multi-stage builds (build tools in production image)
- Separate `RUN` commands for each `apt-get install` package (creates extra layers)
- Not using `--mount=type=cache` for package manager caches

### ❌ Compose
- No health checks on database services
- Using `depends_on` without `condition` (doesn't wait for ready)
- Bind-mounting database data directories (use named volumes)
- Hardcoded secrets in `docker-compose.yml`
