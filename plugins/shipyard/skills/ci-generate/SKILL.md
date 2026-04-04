---
name: ci-generate
description: Generate CI/CD workflow from detected stack. GitHub Actions, GitLab CI, or Bitbucket Pipelines. Includes lint, typecheck, test, build, and deploy stages.
argument-hint: "[--platform github|gitlab|bitbucket] [--deploy vercel|netlify|docker|railway|fly]"
---

Generate a complete CI/CD workflow tailored to the project's detected stack. Supports GitHub Actions, GitLab CI, and Bitbucket Pipelines. Outputs a production-ready pipeline with proper caching, concurrency control, and least-privilege permissions.

## Content Loading

This skill's content is cached locally. Read steps from cache first, fetch only if missing:

```bash
"~/.composure/bin/composure-fetch.mjs" skill shipyard ci-generate {step-filename}
```

**Read from `~/.composure/cache/shipyard/skills/ci-generate/` first.** Only run the fetch command above if the cached file is missing.

## Steps

| # | File | 
|---|------|
| 1 | `01-load-config.md` |
| 2 | `02a-platform-generation.md` |
| 3 | `02b-deploy-templates-and-diff.md` |
| 4 | `03-validate-and-report.md` |
