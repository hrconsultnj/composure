---
name: ci-generate
description: Generate CI/CD workflow from detected stack. GitHub Actions, GitLab CI, or Bitbucket Pipelines. Includes lint, typecheck, test, build, and deploy stages.
argument-hint: "[--platform github|gitlab|bitbucket] [--deploy vercel|netlify|docker|railway|fly]"
---

# Shipyard CI Generate

Generate a complete CI/CD workflow tailored to the project's detected stack. Supports GitHub Actions, GitLab CI, and Bitbucket Pipelines. Outputs a production-ready pipeline with proper caching, concurrency control, and least-privilege permissions.

## Arguments

- `--platform github|gitlab|bitbucket` -- Override the detected CI platform. Defaults to what `.claude/shipyard.json` reports.
- `--deploy vercel|netlify|docker|railway|fly` -- Override the detected deployment target. Defaults to what `.claude/shipyard.json` reports.

## Workflow

**Read each step file in order. Do NOT skip steps. Each step ends with "Next: read step X."**

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-load-config.md` | Read shipyard.json, read reference docs, determine stages |
| 2a | `steps/02a-platform-generation.md` | GitHub Actions / GitLab CI / Bitbucket generation logic |
| 2b | `steps/02b-deploy-templates-and-diff.md` | Deployment target templates, diff check, confirmation |
| 3 | `steps/03-validate-and-report.md` | Run ci-validate, report, required secrets |

**Start by reading:** `steps/01-load-config.md`

## Notes

- Templates in `templates/github-actions/` are starting points. Customize based on detected stack.
- Generated workflows MUST pin action versions (`@v4` minimum, prefer latest stable)
- Generated workflows MUST use `${{ secrets.* }}` for all credentials
- Generated workflows MUST include `permissions` block (principle of least privilege)
- Generated workflows MUST cache dependencies properly
- Generated workflows MUST include `timeout-minutes` on every job
- If `--platform` or `--deploy` flags are passed, they override the detected values for this generation only -- they do NOT update `.claude/shipyard.json`
- For monorepos, consider path-based triggers: `paths: ['apps/web/**', 'packages/shared/**']`
