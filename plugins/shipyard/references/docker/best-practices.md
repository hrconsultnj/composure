# Docker Best Practices

> Load when `Dockerfile` or `docker-compose.yml` / `docker-compose.yaml` / `compose.yml` is detected in the project.

---

## Multi-Stage Builds

Every production Dockerfile should use multi-stage builds. Three stages is the standard:

```dockerfile
# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm build

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 app && adduser --system --uid 1001 app
COPY --from=build --chown=app:app /app/dist ./dist
USER app
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**Why:** Final image has no build tools, no source code, no dev dependencies. Smaller image, less attack surface.

---

## Base Image Selection

| Image | Size | Use Case |
|-------|------|----------|
| `node:22-alpine` | ~50MB | General Node.js -- best default |
| `node:22-slim` | ~80MB | When alpine causes musl/glibc issues |
| `python:3.12-slim` | ~45MB | General Python -- best default |
| `golang:1.23-alpine` | ~250MB | Go build stage only |
| `gcr.io/distroless/static` | ~2MB | Go/Rust final stage -- no shell, minimal attack surface |

**Never use `latest` tag.** Pin to specific version: `node:22.12-alpine`.

---

## Non-Root User

Always run containers as a non-root user in production.

```dockerfile
RUN addgroup --system --gid 1001 app && \
    adduser --system --uid 1001 app
COPY --from=build --chown=app:app /app/dist ./dist
USER app
```

Running as root means a container escape gives the attacker root on the host.

---

## .dockerignore

Without `.dockerignore`, `COPY . .` sends everything to the Docker daemon.

```
node_modules
.git
.env
.env.*
*.md
.next
.turbo
coverage
__tests__
*.test.*
*.spec.*
.github
.vscode
Dockerfile
docker-compose*.yml
```

Benefits: faster builds, no secrets in build context, no cache busting from irrelevant file changes.

---

## Layer Caching

Order `COPY` statements for maximum cache hits. Dependencies change less often than source code.

```dockerfile
# GOOD: lockfile first, install, then source
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# BAD: any source change rebuilds dependencies
COPY . .
RUN pnpm install && pnpm build
```

Clean up in the same `RUN` command -- a separate `RUN rm` doesn't reduce image size.

---

## HEALTHCHECK Instruction

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
```

Use `wget` over `curl` in alpine images -- `wget` is built in. For distroless images, use the app's own binary with a health flag.

---

## Security Scanning

Scan images before deploying:

```bash
trivy image myapp:latest              # Trivy (free, most popular)
docker scout cves myapp:latest        # Docker Scout (built-in)
```

In CI, fail the build on critical/high vulnerabilities:

```yaml
- uses: aquasecurity/trivy-action@master
  with:
    image-ref: myapp:${{ github.sha }}
    severity: 'CRITICAL,HIGH'
    exit-code: '1'
```

---

## Docker Compose Best Practices

### Named Volumes for Persistence

```yaml
services:
  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

Never use bind mounts for database storage in production.

### Health Checks for Dependencies

```yaml
services:
  db:
    image: postgres:16-alpine
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      timeout: 5s
      retries: 5
  app:
    depends_on:
      db:
        condition: service_healthy       # Wait for DB health, not just start
```

### Resource Limits

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 128M
```

### Network Isolation

```yaml
services:
  app:
    networks: [frontend, backend]
  db:
    networks: [backend]               # DB not accessible from frontend
  nginx:
    networks: [frontend]
networks:
  frontend:
  backend:
```

### Never Use `privileged: true`

If you think you need it, use a specific `cap_add` instead:

```yaml
# BAD
privileged: true

# GOOD
cap_add:
  - NET_ADMIN
```

---

## Build Args vs Environment Variables

| Mechanism | Available | Use For |
|-----------|-----------|---------|
| `ARG` | Build time only | Node version, build flags |
| `ENV` | Build + runtime | `NODE_ENV`, app config |
| `--env-file` | Runtime only | Secrets, database URLs |

**Never put secrets in `ARG` or `ENV`.** They're visible in `docker history`.

---

## Image Size Optimization

```dockerfile
# Combine RUN commands and clean up in the same layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# pip: skip cache
RUN pip install --no-cache-dir -r requirements.txt
```

---

## Production vs Development Compose

```yaml
# docker-compose.yml (base/production)
services:
  app:
    build: .
    environment:
      - NODE_ENV=production

# docker-compose.override.yml (dev -- auto-loaded by `docker compose up`)
services:
  app:
    build:
      target: deps
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: pnpm dev
```

`docker compose up` loads the override automatically. `docker compose -f docker-compose.yml up` for production-like behavior.
