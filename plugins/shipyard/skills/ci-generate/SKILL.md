---
name: ci-generate
description: Generate CI/CD workflow from detected stack and platform.
argument-hint: "[--platform github|gitlab|bitbucket] [--deploy vercel|netlify|docker|railway|fly]"
---

Generate a complete CI/CD workflow tailored to the project's detected stack. Supports GitHub Actions, GitLab CI, and Bitbucket Pipelines. Outputs a production-ready pipeline with proper caching, concurrency control, and least-privilege permissions.

## Progress Tracking

This skill uses TaskCreate for progress tracking. Before starting work:
1. Create one task per major step using TaskCreate
2. Set each task to `in_progress` when starting it (TaskUpdate)
3. Mark `completed` when done
4. Write deliverables to files, not inline — inline text is for communication only

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill shipyard ci-generate {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `01-load-config.md` |
| 2 | `02a-platform-generation.md` |
| 3 | `02b-deploy-templates-and-diff.md` |
| 4 | `03-validate-and-report.md` |
