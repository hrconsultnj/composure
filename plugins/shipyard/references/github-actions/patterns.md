# GitHub Actions Patterns

> Load when `.github/workflows/` is detected in the project.

---

## Workflow Syntax Overview

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - run: echo "hello"
```

---

## Trigger Events

```yaml
on:
  push:
    branches: [main]
    paths: ['src/**', 'package.json']       # Only when these paths change
    paths-ignore: ['docs/**', '*.md']       # Or skip these paths
  pull_request:
    branches: [main]
  workflow_dispatch:                          # Manual trigger
    inputs:
      environment:
        type: choice
        options: [staging, production]
  schedule:
    - cron: '0 6 * * 1'                     # Every Monday 6 AM UTC
  release:
    types: [published]
```

---

## Caching

### pnpm (built-in)

```yaml
- uses: pnpm/action-setup@v4
- uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: 'pnpm'
```

### Next.js Build Cache

```yaml
- uses: actions/cache@v4
  with:
    path: ${{ github.workspace }}/.next/cache
    key: nextjs-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-${{ hashFiles('src/**') }}
    restore-keys: |
      nextjs-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-
```

### Turborepo Cache

```yaml
- uses: actions/cache@v4
  with:
    path: .turbo
    key: turbo-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-${{ github.sha }}
    restore-keys: |
      turbo-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-
```

---

## Matrix Strategy

```yaml
strategy:
  fail-fast: false
  matrix:
    node-version: [20, 22]
runs-on: ubuntu-latest
steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
```

---

## Concurrency

```yaml
# PR checks: cancel in-progress on new push
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

# Deploy: never cancel in-progress
concurrency:
  group: deploy-production
  cancel-in-progress: false
```

---

## Secrets and Permissions

```yaml
permissions:
  contents: read
  pull-requests: write    # PR comments
  packages: write         # Container registry
  id-token: write         # OIDC for cloud auth

steps:
  - run: deploy.sh
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

**Never use `permissions: write-all`.** Scope to what the job needs.

### Environment Protection

```yaml
jobs:
  deploy:
    environment:
      name: production
      url: https://myapp.com
```

Environments support manual approval, wait timers, and branch restrictions.

---

## Reusable Workflows

```yaml
# .github/workflows/ci-shared.yml -- define
on:
  workflow_call:
    inputs:
      node-version:
        type: string
        default: '22'
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
      - run: npm ci && npm test

# .github/workflows/ci.yml -- call
jobs:
  ci:
    uses: ./.github/workflows/ci-shared.yml
    with:
      node-version: '22'
    secrets: inherit
```

---

## Action Pinning

Pin by SHA for security. Tags can be moved; SHAs cannot.

```yaml
- uses: actions/checkout@v4                                          # tag (convenient)
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11   # SHA (secure)
```

Use Dependabot or Renovate to keep pinned SHAs updated.

---

## Artifacts

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: build-output
    path: .next/
    retention-days: 7

# In a downstream job
- uses: actions/download-artifact@v4
  with:
    name: build-output
```

---

## Common Patterns

### PR Check

```yaml
name: PR Check
on: { pull_request: { branches: [main] } }
concurrency:
  group: pr-${{ github.event.pull_request.number }}
  cancel-in-progress: true
jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
```

### Deploy on Push to Main

```yaml
deploy:
  needs: check
  runs-on: ubuntu-latest
  environment: { name: production, url: https://myapp.com }
  steps:
    - uses: actions/checkout@v4
    - run: ./scripts/deploy.sh
      env:
        DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

### Scheduled Security Scan

```yaml
name: Security Audit
on:
  schedule: [{ cron: '0 8 * * 1' }]
  workflow_dispatch:
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile && pnpm audit --audit-level=high
```

### Release with npm Publish

```yaml
name: Release
on: { release: { types: [published] } }
permissions: { contents: write, packages: write }
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', registry-url: 'https://registry.npmjs.org' }
      - run: pnpm install --frozen-lockfile && pnpm build && pnpm publish --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Job Dependencies and Conditionals

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
  test:
    runs-on: ubuntu-latest
  deploy:
    needs: [lint, test]
    if: github.ref == 'refs/heads/main'
```

### Conditional on Changed Files

```yaml
- uses: dorny/paths-filter@v3
  id: changes
  with:
    filters: |
      backend:
        - 'api/**'
- run: pnpm test:api
  if: steps.changes.outputs.backend == 'true'
```

---

## Debugging

- **`ACTIONS_STEP_DEBUG`**: Set as repo secret with value `true` for verbose logs.
- **`act`**: Run workflows locally with [nektos/act](https://github.com/nektos/act).
- **`workflow_dispatch`**: Add manual trigger to test without pushing commits.
- **`timeout-minutes`**: Always set to prevent hung jobs burning minutes.
