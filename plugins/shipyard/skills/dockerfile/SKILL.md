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

**Read each step file in order. Do NOT skip steps. Each step ends with a "Next:" directive.**

| Mode | Steps |
|------|-------|
| `--generate` | steps 01 + 02 |
| `--validate` | steps 01 + 03 |
| Default (no flag) | steps 01 + 02 + 03 |

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-detect-stack.md` | Read config, extract framework, package manager, node version, build command, output dir |
| 2 | `steps/02-generate.md` | Select framework template from `templates/`, fill placeholders, generate .dockerignore |
| 3 | `steps/03-validate.md` | Run hadolint + built-in checks, report results, write critical issues to task queue |

**Start by reading:** `steps/01-detect-stack.md`

## Key Constraints

- **Multi-stage builds always.** Separate build tools from runtime to minimize image size and attack surface.
- **Non-root user always.** Every generated Dockerfile includes a non-root USER in the final stage.
- **HEALTHCHECK always.** Every generated Dockerfile includes a HEALTHCHECK for orchestrator compatibility.
- **Use template files.** Read from `templates/` directory -- do NOT reconstruct Dockerfile content from memory.
- **Task queue prefix.** Critical issues use `**[Docker]**` prefix in `tasks-plans/tasks.md` for grep-ability.

## Notes

- Generated Dockerfiles are framework-specific -- they use the correct build commands, output paths, and serve strategies
- `.dockerignore` is generated alongside the Dockerfile if missing
- For Next.js, `output: 'standalone'` in `next.config` is required -- the skill checks for this and warns if missing
- For SPAs (Vite, CRA), an `nginx.conf` for SPA routing is generated if missing
- Validation checks complement hadolint -- hadolint covers Dockerfile syntax and shell best practices, built-in checks cover application-level concerns
