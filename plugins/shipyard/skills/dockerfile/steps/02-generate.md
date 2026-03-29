# Step 2: Generate Dockerfile (--generate)

Generate a framework-specific, multi-stage Dockerfile.

## Template Selection

Based on the framework detected in Step 1, read the matching template:

| Framework | Template file |
|-----------|--------------|
| Next.js | `templates/nextjs.Dockerfile` |
| Vite / SPA (React, Vue, Svelte) | `templates/vite-spa.Dockerfile` |
| Python / FastAPI | `templates/python-fastapi.Dockerfile` |
| Go | `templates/go.Dockerfile` |
| Rust | `templates/rust.Dockerfile` |
| Node.js (Express, Fastify, Hono, etc.) | `templates/node-generic.Dockerfile` |

Read the selected template file. Replace placeholders with values from Step 1:
- `{{NODE_VERSION}}` — Node version (default: 22)
- `{{PACKAGE_MANAGER}}` — pnpm, npm, bun, etc.
- `{{BUILD_COMMAND}}` — From package.json scripts (e.g., `pnpm build`)
- `{{OUTPUT_DIR}}` — Build output directory (.next, dist, build, etc.)

## Framework-Specific Notes

### Next.js

The `next.config` must have `output: 'standalone'` for the Dockerfile to work. Check the config file and warn if it is missing:

```
WARNING: next.config does not have output: 'standalone'.
  Add this to next.config.ts:
    export default { output: 'standalone', ... }
  Without it, the standalone build stage will fail.
```

### Vite / SPA

Also generate an `nginx.conf` for SPA routing if it does not exist. Read `templates/nginx-spa.conf` for the template.

### Python / FastAPI

For `pyproject.toml` projects, adjust to use `pip install .` or `poetry install --no-dev`.

### Go

Go builds produce static binaries -- use `distroless/static` or `scratch` for minimal attack surface.

## Generate .dockerignore

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

## Overwrite Protection

If a Dockerfile already exists, show a diff and ask before overwriting.

---

**Next:** Read `steps/03-validate.md` (if running default mode), or stop (if `--generate` only).
