# Step 2a: Platform-Specific Generation Logic

Reference existing templates in `templates/github-actions/` (e.g., `nextjs-vercel.yml`, `node-generic.yml`, `monorepo-turbo.yml`, `python-fastapi.yml`) as starting points. Customize based on detected stack.

## GitHub Actions (`.github/workflows/ci.yml`)

Generate a workflow with these requirements:

**Triggers:**
```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

Do NOT trigger on push to all branches -- that wastes resources.

**Concurrency control:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}
```

Cancel in-progress runs on new pushes to the same branch, but never cancel main branch runs.

**Permissions (least privilege):**
```yaml
permissions:
  contents: read
  pull-requests: write  # only if needed for PR comments
```

Start with `contents: read` only. Add permissions as needed by specific steps.

**Caching strategy (based on package manager):**

For pnpm:
```yaml
- uses: pnpm/action-setup@v4
- uses: actions/setup-node@v4
  with:
    node-version: ${{ nodeVersion }}
    cache: 'pnpm'
```

For npm:
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: ${{ nodeVersion }}
    cache: 'npm'
```

For bun:
```yaml
- uses: oven-sh/setup-bun@v2
  with:
    bun-version: latest
```

**Next.js build cache** (if framework is nextjs):
```yaml
- uses: actions/cache@v4
  with:
    path: ${{ github.workspace }}/.next/cache
    key: nextjs-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}-${{ hashFiles('**/*.ts', '**/*.tsx') }}
    restore-keys: |
      nextjs-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}-
      nextjs-${{ runner.os }}-
```

**Timeout:** Include `timeout-minutes` on every job. Default: 15 minutes for CI, 10 for deploy.

**Action versions:** Use `@v4` minimum for all official actions. Prefer the latest stable major version. Reference docs from `.claude/ci/generated/` may have more current versions.

**Environment variables:** Use `${{ secrets.* }}` for ALL credentials. NEVER hardcode secrets. Reference common env vars with comments:

```yaml
env:
  # Set these in GitHub repo settings > Secrets and variables > Actions
  VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

## GitLab CI (`.gitlab-ci.yml`)

Generate with:
- Proper `stages:` declaration matching the dependency chain
- `cache:` with package manager paths
- `rules:` instead of deprecated `only/except`
- `interruptible: true` on non-deploy jobs
- `needs:` for job dependency graph

## Bitbucket Pipelines (`bitbucket-pipelines.yml`)

Generate with:
- `caches:` definitions for the package manager
- `step:` structure matching the pipeline stages
- `max-time:` on each step
- Proper `deployment:` for deploy steps

---

**Next:** Read `steps/02b-deploy-templates-and-diff.md`
