# Step 3a: Heuristic Checks 1-6

Run these checks regardless of whether actionlint is available. These catch issues that linters miss because they require project context.

Read `.claude/shipyard.json` for project context (package manager, Node version, test framework, etc.).

**You MUST run ALL 6 checks in this file. Do NOT skip any.**

## Check 1: Wrong Node.js Version

Read `package.json` `engines.node` field and compare against the workflow's `node-version`:

```
ISSUE: Node.js version mismatch
  Workflow uses: node-version: 18
  package.json engines: "node": ">=20"
  Suggestion: Update to node-version: 22 (LTS)
  Severity: High
```

Also check `.nvmrc`, `.node-version`, or `.tool-versions` files.

## Check 2: Wrong Package Manager

Compare the workflow's install command against the project's actual lockfile:

| Lockfile present | Expected install command |
|-----------------|------------------------|
| `pnpm-lock.yaml` | `pnpm install` (NOT `npm install` or `npm ci`) |
| `package-lock.json` | `npm ci` (NOT `npm install`) |
| `yarn.lock` | `yarn install --frozen-lockfile` |
| `bun.lockb` or `bun.lock` | `bun install --frozen-lockfile` |

```
ISSUE: Package manager mismatch
  Workflow uses: npm ci
  Project lockfile: pnpm-lock.yaml
  Suggestion: Replace with pnpm install --frozen-lockfile. Add pnpm/action-setup@v4 step.
  Severity: Critical
```

## Check 3: Missing Dependency Cache

Check if the workflow caches dependencies:

- For pnpm: `cache: 'pnpm'` in setup-node, OR `actions/cache` with pnpm store path
- For npm: `cache: 'npm'` in setup-node
- For yarn: `cache: 'yarn'` in setup-node
- For bun: setup-bun handles caching

```
ISSUE: No dependency caching
  Install step runs without cache, causing full download on every run.
  Suggestion: Add cache: 'pnpm' to actions/setup-node, or use actions/cache with pnpm store.
  Severity: Medium
```

## Check 4: Missing Build Cache (Next.js)

If the project is Next.js, check for `.next/cache` caching:

```
ISSUE: No Next.js build cache
  Next.js rebuilds everything on each CI run without .next/cache persistence.
  Suggestion: Add actions/cache step for .next/cache directory.
  Severity: Medium
```

## Check 5: Secrets Referenced but Not Documented

Scan for `${{ secrets.* }}` references and list them:

```
ISSUE: Undocumented secrets
  Workflow references these secrets -- ensure they are set in repo settings:
  - VERCEL_TOKEN
  - VERCEL_ORG_ID
  - VERCEL_PROJECT_ID
  Severity: Info
```

## Check 6: No Concurrency Control

Check for `concurrency:` block at workflow or job level:

```
ISSUE: No concurrency control
  Multiple runs can execute simultaneously, wasting resources and causing race conditions on deploy.
  Suggestion: Add concurrency group with cancel-in-progress for PRs.
  Severity: Medium
```

---

**Next:** Read `steps/03b-heuristic-checks-7-12.md`
