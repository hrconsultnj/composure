---
name: ci-validate
description: Validate CI/CD workflow files. Runs actionlint for GitHub Actions, checks for common mistakes, and reports issues with fix suggestions.
argument-hint: "[workflow-file]"
---

# Shipyard CI Validate

Validate CI/CD workflow files for syntax errors, common mistakes, and best practice violations. Combines external linters (actionlint) with built-in heuristic checks that catch issues linters miss.

## Arguments

- `[workflow-file]` -- Path to a specific workflow file to validate. If omitted, validates ALL detected CI config files.

## Workflow

### Step 1: Find CI Config Files

If a specific file was provided, validate only that file.

Otherwise, find all CI configuration files in the project:

```bash
# GitHub Actions
ls .github/workflows/*.yml .github/workflows/*.yaml 2>/dev/null

# GitLab CI
ls .gitlab-ci.yml 2>/dev/null

# Bitbucket Pipelines
ls bitbucket-pipelines.yml 2>/dev/null

# CircleCI
ls .circleci/config.yml 2>/dev/null

# Jenkinsfile (Groovy -- limited validation)
ls Jenkinsfile 2>/dev/null
```

If no CI config files are found:

```
No CI/CD configuration files found. Run /shipyard:ci-generate to create one.
```

### Step 2: External Linter (actionlint)

For GitHub Actions workflows, check if `actionlint` is available:

```bash
actionlint --version 2>/dev/null
```

If available, run it on each GitHub Actions workflow:

```bash
actionlint .github/workflows/ci.yml
```

Parse the output. Each error includes file, line number, column, and message. Record all findings.

If `actionlint` is not available, note it:

```
actionlint not available -- using built-in checks only.
Install for deeper validation: brew install actionlint
```

### Step 3: Built-in Heuristic Checks

Run these checks regardless of whether actionlint is available. These catch issues that linters miss because they require project context.

Read `.claude/shipyard.json` for project context (package manager, Node version, test framework, etc.).

#### Check 1: Wrong Node.js Version

Read `package.json` `engines.node` field and compare against the workflow's `node-version`:

```
ISSUE: Node.js version mismatch
  Workflow uses: node-version: 18
  package.json engines: "node": ">=20"
  Suggestion: Update to node-version: 22 (LTS)
  Severity: High
```

Also check `.nvmrc`, `.node-version`, or `.tool-versions` files.

#### Check 2: Wrong Package Manager

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

#### Check 3: Missing Dependency Cache

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

#### Check 4: Missing Build Cache (Next.js)

If the project is Next.js, check for `.next/cache` caching:

```
ISSUE: No Next.js build cache
  Next.js rebuilds everything on each CI run without .next/cache persistence.
  Suggestion: Add actions/cache step for .next/cache directory.
  Severity: Medium
```

#### Check 5: Secrets Referenced but Not Documented

Scan for `${{ secrets.* }}` references and list them:

```
ISSUE: Undocumented secrets
  Workflow references these secrets -- ensure they are set in repo settings:
  - VERCEL_TOKEN
  - VERCEL_ORG_ID
  - VERCEL_PROJECT_ID
  Severity: Info
```

#### Check 6: No Concurrency Control

Check for `concurrency:` block at workflow or job level:

```
ISSUE: No concurrency control
  Multiple runs can execute simultaneously, wasting resources and causing race conditions on deploy.
  Suggestion: Add concurrency group with cancel-in-progress for PRs.
  Severity: Medium
```

#### Check 7: No Timeout

Check for `timeout-minutes:` on each job:

```
ISSUE: Missing timeout-minutes
  Jobs without timeout can hang indefinitely and consume CI minutes.
  Jobs missing timeout: [build, deploy]
  Suggestion: Add timeout-minutes: 15 to each job.
  Severity: Medium
```

#### Check 8: Deprecated Actions

Check for outdated action versions:

| Pattern | Issue |
|---------|-------|
| `actions/checkout@v2` or `@v3` | Use `@v4` |
| `actions/setup-node@v2` or `@v3` | Use `@v4` |
| `actions/cache@v2` or `@v3` | Use `@v4` |
| `actions/upload-artifact@v2` or `@v3` | Use `@v4` |

```
ISSUE: Deprecated action version
  actions/checkout@v3 is outdated (latest stable: v4).
  Suggestion: Update to actions/checkout@v4
  Severity: Medium
```

#### Check 9: Missing Permissions Block

Check if the workflow has a top-level `permissions:` block:

```
ISSUE: Missing permissions block
  Without explicit permissions, the workflow runs with the default token permissions
  (which may be overly broad depending on repo settings).
  Suggestion: Add permissions: { contents: read } at the workflow level.
  Severity: Medium
```

#### Check 10: Overly Broad Triggers

Check the `on:` trigger configuration:

```
ISSUE: Overly broad trigger
  Workflow triggers on push to ALL branches. This runs CI on every push to every branch.
  Suggestion: Restrict to push on main + pull_request events.
  Severity: Low
```

#### Check 11: No Test Step

If `.claude/shipyard.json` shows `hasTests: true` but no test step exists in the workflow:

```
ISSUE: Missing test step
  Project has a test suite (pnpm test) but the CI workflow does not run tests.
  Suggestion: Add a test job that runs after install.
  Severity: High
```

#### Check 12: npm install instead of npm ci

If the workflow uses `npm install` instead of `npm ci`:

```
ISSUE: Using npm install instead of npm ci
  npm install can modify package-lock.json, leading to inconsistent builds.
  Suggestion: Replace npm install with npm ci for reproducible installs.
  Severity: High
```

### Step 4: Report

Aggregate all findings and report with severity levels:

```
CI/CD Validation: .github/workflows/ci.yml

actionlint: passed (0 errors)

Built-in checks:
  Critical (1):
    1. Package manager mismatch -- uses npm ci but project has pnpm-lock.yaml
       Fix: Replace npm ci with pnpm install --frozen-lockfile
       Line: 28

  High (1):
    2. Node.js version mismatch -- workflow uses 18, project requires >=20
       Fix: Update node-version to 22
       Line: 22

  Medium (2):
    3. No concurrency control
       Fix: Add concurrency group at workflow level
    4. Missing timeout-minutes on jobs: [build, deploy]
       Fix: Add timeout-minutes: 15

  Low (0): none

Summary: 1 critical, 1 high, 2 medium, 0 low
```

### Step 5: Write Critical/High Issues to Task Queue

If any Critical or High severity issues were found, write them to `tasks-plans/tasks.md`:

```markdown
- [ ] **[CI]** Package manager mismatch in ci.yml -- uses npm ci but project has pnpm-lock.yaml. Fix: replace with `pnpm install --frozen-lockfile` (line 28)
- [ ] **[CI]** Node.js version mismatch in ci.yml -- uses 18, project requires >=20. Fix: update `node-version` to 22 (line 22)
```

These integrate with Composure's `/commit` gate -- open Critical/High tasks on staged files block commits.

## Notes

- This skill is called automatically by `/shipyard:ci-generate` after generating a workflow
- It can also be called standalone to validate existing workflows
- actionlint provides deep GitHub Actions validation (expression syntax, action inputs, etc.) -- the built-in checks supplement it with project-context awareness
- For GitLab CI and Bitbucket Pipelines, only built-in heuristic checks run (no external linter)
- Jenkinsfile is Groovy-based and has limited static validation -- only basic checks apply
- Issues written to task queue use `**[CI]**` prefix to distinguish from Composure code quality tasks and Sentinel security tasks
