# Step 3: Validate and Report

## Validate Generated Workflow

After writing the workflow, run `/shipyard:ci-validate` on it to verify:

1. YAML syntax is valid
2. Action references are correct
3. No common mistakes (wrong package manager, missing cache, etc.)

If validation finds issues, fix them immediately and re-validate. Do not leave a broken workflow file.

## Report

```
Generated: .github/workflows/ci.yml

Pipeline stages:
  1. install  -- pnpm install (cached)
  2. lint     -- pnpm lint (parallel with typecheck)
  3. typecheck -- pnpm typecheck (parallel with lint)
  4. test     -- pnpm test
  5. build    -- pnpm build (Next.js cache enabled)
  6. deploy   -- Vercel deployment (main branch only)

Features:
  - Concurrency control (cancels stale PR runs)
  - pnpm store caching + Next.js build cache
  - Least-privilege permissions (contents: read)
  - 15-minute timeout on all jobs
  - Deploy only on push to main

Required secrets (set in GitHub repo settings):
  - VERCEL_TOKEN
  - VERCEL_ORG_ID
  - VERCEL_PROJECT_ID

Validated: actionlint passed (0 errors)
```

## Required Secrets

List ALL secrets referenced in the generated workflow with setup instructions:

- Tell the user exactly where to set them (e.g., GitHub repo settings > Secrets and variables > Actions)
- For Vercel: explain how to get `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- For Netlify: explain how to get `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`
- For Fly.io: explain how to get `FLY_API_TOKEN`
- For Railway: explain how to get `RAILWAY_TOKEN`
- For Docker/GHCR: explain how to configure `GITHUB_TOKEN` permissions

---

**Done.**
