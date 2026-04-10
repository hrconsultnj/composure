---
name: dockerfile
description: Generate/validate Dockerfiles with security best practices.
argument-hint: "[--validate] [--generate]"
---

Generate production-ready Dockerfiles or validate existing ones against security and performance best practices. Produces multi-stage builds with non-root users, health checks, optimized layer caching, and proper `.dockerignore` files.

## Progress Tracking

This skill uses TaskCreate for progress tracking. Before starting work:
1. Create one task per major step using TaskCreate
2. Set each task to `in_progress` when starting it (TaskUpdate)
3. Mark `completed` when done
4. Write deliverables to files, not inline — inline text is for communication only

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill shipyard dockerfile {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

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
