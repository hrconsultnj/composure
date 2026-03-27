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

### Step 1: Load Configuration

Read `.claude/shipyard.json` for stack and CI config:

```bash
cat .claude/shipyard.json 2>/dev/null
```

If missing, run `/shipyard:initialize` first. Do NOT proceed without a config -- the generated workflow depends on accurate stack detection.

Extract these values for workflow generation:
- `ci.platform` -- which CI system to generate for
- `ci.packageManager` -- pnpm, npm, bun, yarn
- `ci.nodeVersion` -- Node.js version for setup-node
- `deployment.targets` -- where to deploy
- `stack.hasTypecheck` -- whether to include a typecheck step
- `stack.hasLint` -- whether to include a lint step
- `stack.hasTests` -- whether to include a test step
- `stack.testCommand` -- exact test command to run
- `stack.buildCommand` -- exact build command to run

### Step 2: Read Reference Docs

Check for Context7-generated CI docs:

```bash
ls .claude/ci/generated/ 2>/dev/null
```

If docs exist for the target platform, read them for up-to-date syntax and patterns. These docs contain current API surface from Context7 -- prefer them over training data for action versions, caching strategies, and config syntax.

### Step 3: Determine Pipeline Stages

Build the stage list based on what the project actually has. Only include stages that are relevant:

| Stage | Include when | Purpose |
|-------|-------------|---------|
| `install` | Always | Install dependencies with proper caching |
| `lint` | `stack.hasLint == true` | Run ESLint / project linter |
| `typecheck` | `stack.hasTypecheck == true` | Run tsc / type checking |
| `test` | `stack.hasTests == true` | Run test suite |
| `build` | `stack.buildCommand` exists | Build the application |
| `security` | Sentinel is installed (`sentinelIntegration == true`) | Run `pnpm audit` / dependency check |
| `deploy` | Deployment target detected | Deploy to target platform |

Stage dependency chain:
```
install -> [lint, typecheck, security] (parallel) -> test -> build -> deploy
```

Lint, typecheck, and security can run in parallel since they are independent. Test depends on install completing. Build depends on test passing. Deploy depends on build succeeding.

### Step 4: Generate the Workflow

#### GitHub Actions (`.github/workflows/ci.yml`)

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

#### GitLab CI (`.gitlab-ci.yml`)

Generate with:
- Proper `stages:` declaration matching the dependency chain
- `cache:` with package manager paths
- `rules:` instead of deprecated `only/except`
- `interruptible: true` on non-deploy jobs
- `needs:` for job dependency graph

#### Bitbucket Pipelines (`bitbucket-pipelines.yml`)

Generate with:
- `caches:` definitions for the package manager
- `step:` structure matching the pipeline stages
- `max-time:` on each step
- Proper `deployment:` for deploy steps

### Step 5: Diff Check (Preserve Existing Workflows)

Before writing, check if the target file already exists:

```bash
cat .github/workflows/ci.yml 2>/dev/null
```

**If the file exists:**

1. Generate the new workflow content
2. Show a clear diff of what would change:
   ```
   Existing workflow: .github/workflows/ci.yml

   Changes:
   + Added typecheck stage (tsconfig.json detected)
   + Added pnpm cache step (was missing)
   + Updated actions/checkout from v3 to v4
   - Removed npm install (project uses pnpm)
   ~ Changed Node version from 18 to 22

   Write these changes? The existing file will be OVERWRITTEN.
   ```
3. Wait for confirmation before writing. NEVER silently overwrite an existing CI workflow.

**If the file does not exist:** Write directly, no confirmation needed.

### Step 6: Validate Generated Workflow

After writing the workflow, run `/shipyard:ci-validate` on it to verify:

1. YAML syntax is valid
2. Action references are correct
3. No common mistakes (wrong package manager, missing cache, etc.)

If validation finds issues, fix them immediately and re-validate. Do not leave a broken workflow file.

### Step 7: Report

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

## Deployment Target Templates

### Vercel

For Vercel deployments, use the Vercel CLI approach (more control than the GitHub integration):

```yaml
- name: Deploy to Vercel
  run: |
    vercel pull --yes --environment=${{ env.DEPLOY_ENV }} --token=${{ secrets.VERCEL_TOKEN }}
    vercel build ${{ env.VERCEL_BUILD_FLAGS }} --token=${{ secrets.VERCEL_TOKEN }}
    vercel deploy --prebuilt ${{ env.VERCEL_DEPLOY_FLAGS }} --token=${{ secrets.VERCEL_TOKEN }}
  env:
    VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
    VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
    DEPLOY_ENV: ${{ github.ref == 'refs/heads/main' && 'production' || 'preview' }}
    VERCEL_BUILD_FLAGS: ${{ github.ref == 'refs/heads/main' && '--prod' || '' }}
    VERCEL_DEPLOY_FLAGS: ${{ github.ref == 'refs/heads/main' && '--prod' || '' }}
```

### Netlify

Use the Netlify CLI:

```yaml
- name: Deploy to Netlify
  run: netlify deploy ${{ github.ref == 'refs/heads/main' && '--prod' || '' }} --dir=dist
  env:
    NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
    NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### Docker (Container Registry)

Build and push to a container registry:

```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v6
  with:
    context: .
    push: ${{ github.ref == 'refs/heads/main' }}
    tags: |
      ghcr.io/${{ github.repository }}:${{ github.sha }}
      ghcr.io/${{ github.repository }}:latest
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### Fly.io

```yaml
- name: Deploy to Fly.io
  uses: superfly/flyctl-actions/setup-flyctl@master
- run: flyctl deploy --remote-only
  env:
    FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### Railway

```yaml
- name: Deploy to Railway
  run: railway up --service ${{ secrets.RAILWAY_SERVICE_ID }}
  env:
    RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## Notes

- Templates in `templates/github-actions/` are starting points. Customize based on detected stack.
- Generated workflows MUST pin action versions (`@v4` minimum, prefer latest stable)
- Generated workflows MUST use `${{ secrets.* }}` for all credentials
- Generated workflows MUST include `permissions` block (principle of least privilege)
- Generated workflows MUST cache dependencies properly
- Generated workflows MUST include `timeout-minutes` on every job
- If `--platform` or `--deploy` flags are passed, they override the detected values for this generation only -- they do NOT update `.claude/shipyard.json`
- For monorepos, consider path-based triggers: `paths: ['apps/web/**', 'packages/shared/**']`
