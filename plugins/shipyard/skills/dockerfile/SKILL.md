---
name: dockerfile
description: Generate or validate Dockerfiles with security best practices. Multi-stage builds, non-root user, layer caching, .dockerignore.
argument-hint: "[--validate] [--generate]"
---

Generate production-ready Dockerfiles or validate existing ones against security and performance best practices. Produces multi-stage builds with non-root users, health checks, optimized layer caching, and proper `.dockerignore` files.

## Content Loading

This skill's content is served from the Composure API. Before reading a step, fetch it:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/composure-fetch.mjs" skill shipyard dockerfile {step-filename}
```

Cached content is at `~/.composure/cache/shipyard/skills/dockerfile/`. If cached, read directly from there.

## Steps

| # | File | 
|---|------|
| 1 | `01-detect-stack.md` |
| 2 | `02-generate.md` |
| 3 | `03-validate.md` |

## Templates

- `go.Dockerfile`
- `nextjs.Dockerfile`
- `nginx-spa.conf`
- `node-generic.Dockerfile`
- `python-fastapi.Dockerfile`
- `rust.Dockerfile`
- `vite-spa.Dockerfile`
