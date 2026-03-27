---
name: dockerfile
description: Generate or validate Dockerfiles with security best practices. Multi-stage builds, non-root user, layer caching, .dockerignore.
argument-hint: "[--validate] [--generate]"
---

# Shipyard Dockerfile

Generate production-ready Dockerfiles or validate existing ones against security and performance best practices. Produces multi-stage builds with non-root users, health checks, optimized layer caching, and proper `.dockerignore` files.

## Arguments

- `--generate` -- Generate a new Dockerfile based on detected framework. If a Dockerfile already exists, show diff and ask before overwriting.
- `--validate` -- Validate an existing Dockerfile against best practices. Runs hadolint if available, plus built-in checks.
- If neither flag is passed: `--validate` if a Dockerfile exists, `--generate` if not.

## Workflow

### Step 1: Read Stack Configuration

Read Composure config for framework detection:

```bash
cat .claude/no-bandaids.json 2>/dev/null
```

If not available, read `.claude/shipyard.json`:

```bash
cat .claude/shipyard.json 2>/dev/null
```

If neither exists, detect the framework manually from `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`, etc.

Extract:
- Framework (nextjs, vite, fastapi, go, rust, etc.)
- Package manager (pnpm, npm, bun, pip, etc.)
- Node version (from `.nvmrc`, `.node-version`, `package.json` engines, or default to 22)
- Build command (from `package.json` scripts)
- Output directory (`.next` for Next.js, `dist` for Vite, `build` for CRA, etc.)

### Step 2: Generate Dockerfile (--generate)

Generate a framework-specific, multi-stage Dockerfile.

#### Next.js (standalone output)

```dockerfile
# ── Dependencies ─────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# ── Build ────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# next.config must have output: 'standalone'
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable pnpm && pnpm build

# ── Runner ───────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
```

**IMPORTANT for Next.js:** The `next.config` must have `output: 'standalone'` for this Dockerfile to work. Check the config file and warn if it is missing:

```
WARNING: next.config does not have output: 'standalone'.
  Add this to next.config.ts:
    export default { output: 'standalone', ... }
  Without it, the standalone build stage will fail.
```

#### Vite / SPA (static build + nginx serve)

```dockerfile
# ── Build ────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ── Serve ────────────────────────────────────────────────────
FROM nginx:alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

# Non-root user
RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

Also generate an `nginx.conf` for SPA routing if it does not exist:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Python / FastAPI

```dockerfile
# ── Build ────────────────────────────────────────────────────
FROM python:3.12-slim AS builder
WORKDIR /app

# Install build dependencies
RUN pip install --no-cache-dir --upgrade pip

COPY requirements.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Runner ───────────────────────────────────────────────────
FROM python:3.12-slim AS runner
WORKDIR /app

# Copy installed packages from build stage
COPY --from=builder /install /usr/local

# Non-root user
RUN useradd --create-home --shell /bin/bash appuser
COPY . .
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

For `pyproject.toml` projects, adjust to use `pip install .` or `poetry install --no-dev`.

#### Go

```dockerfile
# ── Build ────────────────────────────────────────────────────
FROM golang:1.23-alpine AS builder
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd/server

# ── Runner ───────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian12 AS runner

COPY --from=builder /app/server /server

EXPOSE 8080

USER nonroot:nonroot

ENTRYPOINT ["/server"]
```

Go builds produce static binaries -- use `distroless/static` or `scratch` for minimal attack surface.

#### Rust

```dockerfile
# ── Build ────────────────────────────────────────────────────
FROM rust:1.82-alpine AS builder
RUN apk add --no-cache musl-dev
WORKDIR /app

COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src

COPY . .
RUN cargo build --release

# ── Runner ───────────────────────────────────────────────────
FROM alpine:3.20 AS runner

RUN adduser -D -u 1001 appuser
COPY --from=builder /app/target/release/app /usr/local/bin/app

USER appuser

EXPOSE 8080

ENTRYPOINT ["app"]
```

#### Node.js (generic -- Express, Fastify, Hono, etc.)

```dockerfile
# ── Dependencies ─────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile --prod

# ── Runner ───────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

COPY --from=deps /app/node_modules ./node_modules
COPY . .

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

#### Generate .dockerignore

If `.dockerignore` does not exist, generate one based on the framework:

```
# Dependencies
node_modules
.pnpm-store

# Build output (rebuilt in Docker)
.next
dist
build
out

# Development
.env
.env.local
.env.*.local

# IDE
.vscode
.idea
*.swp
*.swo

# Git
.git
.gitignore

# Docker (prevent recursive COPY)
Dockerfile
docker-compose.yml
.dockerignore

# CI/CD
.github
.gitlab-ci.yml

# Tests
coverage
__tests__
*.test.*
*.spec.*

# Docs
README.md
CHANGELOG.md
LICENSE
```

Adjust based on the framework:
- Python: add `__pycache__/`, `.venv/`, `*.pyc`, `.pytest_cache/`
- Go: add `vendor/` (if not using Go modules vendor)
- Rust: add `target/`

### Step 3: Validate Dockerfile (--validate)

If `--validate` or a Dockerfile already exists, run validation.

#### External linter: hadolint

```bash
hadolint --version 2>/dev/null
```

If available:

```bash
hadolint Dockerfile
```

Parse output for rule violations. Each hadolint rule has a code (e.g., DL3018, SC2086) and severity.

If not available:

```
hadolint not available -- using built-in checks only.
Install for comprehensive Dockerfile linting: brew install hadolint
```

#### Built-in checks

Run these regardless of hadolint availability:

**Check 1: Running as root**

Look for `USER` instruction in the final stage. If missing or set to `root`:

```
ISSUE: Container runs as root
  The final stage has no USER instruction, meaning the process runs as root.
  This is a security risk -- if the application is compromised, the attacker has root access.
  Suggestion: Add a non-root user and switch to it before CMD/ENTRYPOINT.
  Severity: Critical
```

**Check 2: Using :latest tag**

Check `FROM` instructions for `:latest` or no tag:

```
ISSUE: Base image uses :latest tag
  FROM node:latest is unpredictable -- builds may break when the tag moves.
  Suggestion: Pin to a specific version (e.g., node:22-alpine).
  Severity: High
```

**Check 3: Missing .dockerignore**

```bash
ls .dockerignore 2>/dev/null
```

If missing:

```
ISSUE: Missing .dockerignore
  Without .dockerignore, COPY . . sends everything to the Docker daemon,
  including node_modules, .git, .env, and other unnecessary files.
  This increases build time, image size, and may leak secrets.
  Suggestion: Run /shipyard:dockerfile --generate to create one.
  Severity: High
```

**Check 4: Poor layer caching**

Check if `COPY . .` appears before `RUN install` commands. Dependencies should be copied and installed first (lockfile only), then source code:

```
ISSUE: Poor layer caching order
  COPY . . appears before dependency install. Any source code change invalidates
  the dependency install cache, causing full re-download.
  Suggestion: Copy lockfile first, install deps, then COPY source.
  Severity: Medium
```

**Check 5: No HEALTHCHECK**

Check for `HEALTHCHECK` instruction:

```
ISSUE: No HEALTHCHECK defined
  Without HEALTHCHECK, orchestrators cannot detect if the application is responsive.
  Suggestion: Add HEALTHCHECK instruction (wget or curl to health endpoint).
  Severity: Medium
```

**Check 6: Secrets in build**

Check for patterns that might expose secrets:

- `COPY .env` -- copying env files into the image
- `ARG` with secret-looking defaults (`ARG API_KEY=sk-...`)
- `ENV` with hardcoded credentials

```
ISSUE: Possible secret exposure
  COPY .env copies environment file into the image. Secrets in images
  are extractable by anyone with access to the image.
  Suggestion: Use runtime environment variables or Docker secrets instead.
  Severity: Critical
```

**Check 7: Unnecessary EXPOSE**

Check if EXPOSE matches the application port. Warn about EXPOSE on non-standard ports without justification.

**Check 8: No multi-stage build**

If the Dockerfile has only one `FROM` and includes build tools in the final image:

```
ISSUE: Single-stage build includes build tools
  The final image contains build dependencies (compilers, dev packages)
  that are not needed at runtime, increasing image size and attack surface.
  Suggestion: Use multi-stage build -- build in one stage, copy artifacts to a minimal runtime stage.
  Severity: Medium
```

### Step 4: Report

```
Dockerfile Validation: ./Dockerfile

hadolint: passed (0 errors, 2 warnings)
  DL3018 (warning): Pin versions in apk add
  SC2086 (info): Double quote to prevent globbing

Built-in checks:
  Critical (0): none

  High (1):
    1. Base image uses :latest tag -- FROM node:latest
       Fix: Pin to node:22-alpine
       Line: 1

  Medium (2):
    2. Poor layer caching order -- COPY . . before pnpm install
       Fix: Copy package.json + lockfile first, install, then COPY source
       Lines: 5-6
    3. No HEALTHCHECK defined
       Fix: Add HEALTHCHECK instruction

  Low (0): none

Summary: 0 critical, 1 high, 2 medium, 0 low
Image estimate: ~180MB (could reduce to ~120MB with multi-stage + alpine)
```

### Step 5: Write Critical Issues to Task Queue

Write Critical severity issues to `tasks-plans/tasks.md`:

```markdown
- [ ] **[Docker]** Container runs as root -- Dockerfile has no USER instruction. Add non-root user in final stage.
- [ ] **[Docker]** Secret exposure -- COPY .env copies secrets into image. Use runtime env vars instead.
```

## Notes

- Generated Dockerfiles are framework-specific -- they use the correct build commands, output paths, and serve strategies
- Multi-stage builds are always used to minimize final image size and attack surface
- Non-root user is always included in the final stage
- HEALTHCHECK is always included for orchestrator compatibility
- `.dockerignore` is generated alongside the Dockerfile if missing
- For Next.js, `output: 'standalone'` in `next.config` is required -- the skill checks for this and warns if missing
- For SPAs (Vite, CRA), an `nginx.conf` for SPA routing is generated if missing
- Validation checks complement hadolint -- hadolint covers Dockerfile syntax and shell best practices, built-in checks cover application-level concerns
- Issues use `**[Docker]**` prefix in the task queue for grep-ability
