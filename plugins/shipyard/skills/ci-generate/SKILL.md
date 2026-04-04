---
name: ci-generate
description: Generate CI/CD workflow from detected stack. GitHub Actions, GitLab CI, or Bitbucket Pipelines. Includes lint, typecheck, test, build, and deploy stages.
argument-hint: "[--platform github|gitlab|bitbucket] [--deploy vercel|netlify|docker|railway|fly]"
---

Generate a complete CI/CD workflow tailored to the project's detected stack. Supports GitHub Actions, GitLab CI, and Bitbucket Pipelines. Outputs a production-ready pipeline with proper caching, concurrency control, and least-privilege permissions.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"~/.composure/bin/composure-fetch.mjs" skill shipyard ci-generate {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `01-load-config.md` |
| 2 | `02a-platform-generation.md` |
| 3 | `02b-deploy-templates-and-diff.md` |
| 4 | `03-validate-and-report.md` |
