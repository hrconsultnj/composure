---
name: initialize
description: Detect deployment targets, CI/CD platforms, container configs, and generate .claude/shipyard.json. Query Context7 for CI/CD reference docs. Run once per project.
argument-hint: "[--force] [--dry-run] [--skip-context7]"
---

# Shipyard Initialize

Bootstrap Shipyard project-level configuration by detecting CI/CD platforms, deployment targets, container configs, and available DevOps tooling.

## Arguments

- `--force` -- Overwrite existing `.claude/shipyard.json`, regenerate CI docs older than 7 days
- `--dry-run` -- Show what would be generated without writing files
- `--skip-context7` -- Skip Context7 queries (for offline/CI use)

## Workflow

### Step 1: Read Composure Config

Check if Composure has already profiled the project:

```bash
cat .claude/no-bandaids.json 2>/dev/null
```

If `.claude/no-bandaids.json` exists, extract `frameworks`, `packageManager`, and stack info -- no need to re-detect what Composure already knows.

If it does not exist, detect the stack manually by reading:

| File | What to extract |
|------|----------------|
| `package.json` | Framework, dependencies, scripts, engines, packageManager field |
| `tsconfig.json` | TypeScript presence |
| `requirements.txt` / `pyproject.toml` | Python presence |
| `go.mod` | Go presence |
| `Cargo.toml` | Rust presence |

Build a minimal stack profile:

```json
{
  "framework": "nextjs",
  "packageManager": "pnpm",
  "nodeVersion": "22",
  "hasTypecheck": true,
  "hasLint": true,
  "hasTests": true,
  "testCommand": "pnpm test",
  "buildCommand": "pnpm build"
}
```

Extract `hasTypecheck`, `hasLint`, `hasTests` from `package.json` scripts:
- `hasTypecheck` -- true if scripts contain `tsc`, `typecheck`, or `type-check`
- `hasLint` -- true if scripts contain `lint` or `eslint`
- `hasTests` -- true if scripts contain `test`, `vitest`, `jest`, or `playwright`
- `testCommand` -- the exact script command (e.g., `pnpm test`, `pnpm vitest`)
- `buildCommand` -- the exact build script (e.g., `pnpm build`, `npm run build`)

### Step 2: Detect Deployment Platform

Scan project root for deployment configuration files. Check each in order and record ALL matches (a project can have both Vercel and Docker):

| File / Directory | Platform |
|-----------------|----------|
| `.github/workflows/` | GitHub Actions |
| `.gitlab-ci.yml` | GitLab CI |
| `bitbucket-pipelines.yml` | Bitbucket Pipelines |
| `.circleci/config.yml` | CircleCI |
| `Jenkinsfile` | Jenkins |
| `vercel.json` or `.vercel/` | Vercel |
| `netlify.toml` | Netlify |
| `fly.toml` | Fly.io |
| `railway.toml` or `railway.json` | Railway |
| `render.yaml` | Render |
| `Dockerfile` | Docker (container deployment) |
| `docker-compose.yml` or `docker-compose.yaml` or `compose.yml` | Docker Compose |
| `k8s/` or `kubernetes/` or any `*.yaml` with `apiVersion:` | Kubernetes |
| `terraform/` or `*.tf` files | Terraform |
| `pulumi/` or `Pulumi.yaml` | Pulumi |
| `serverless.yml` or `serverless.ts` | Serverless Framework |
| `amplify.yml` or `amplify/` | AWS Amplify |
| `appspec.yml` | AWS CodeDeploy |

If none found, check `package.json` scripts and devDependencies for clues:
- `"vercel"` in scripts or deps -> Vercel
- `"netlify-cli"` in deps -> Netlify
- `"wrangler"` in deps -> Cloudflare Workers

For GitHub Actions, also list existing workflows:

```bash
ls .github/workflows/*.yml .github/workflows/*.yaml 2>/dev/null
```

Record filenames for the config output.

**Determine primary CI platform** (the one that runs tests/builds) vs **deployment target** (where code ships to). A project typically has one CI platform and one or more deployment targets.

### Step 3: Detect Installed CI/CD Tools

Check for available tooling. Run each with version flag, suppress errors:

```bash
actionlint --version 2>/dev/null    # GitHub Actions linter
act --version 2>/dev/null            # Local GitHub Actions runner
hadolint --version 2>/dev/null       # Dockerfile linter
docker --version 2>/dev/null         # Container runtime
kubectl version --client 2>/dev/null # Kubernetes CLI
terraform --version 2>/dev/null      # IaC
vercel --version 2>/dev/null         # Vercel CLI
netlify --version 2>/dev/null        # Netlify CLI
flyctl version 2>/dev/null           # Fly.io CLI
railway version 2>/dev/null          # Railway CLI
gh --version 2>/dev/null             # GitHub CLI
gitlab --version 2>/dev/null         # GitLab CLI
```

Record installed tools with their versions. For tools that are NOT installed but would be useful based on the detected platform, suggest installation using the system installer.

**System installer detection** (same pattern as Sentinel):

```bash
brew --version 2>/dev/null   # macOS
apt --version 2>/dev/null    # Debian/Ubuntu
dnf --version 2>/dev/null    # Fedora/RHEL
pacman --version 2>/dev/null # Arch
choco --version 2>/dev/null  # Windows
nix --version 2>/dev/null    # NixOS/cross-platform
```

Use the preferred system installer for suggestions. Example:

```
actionlint is not installed. It validates GitHub Actions workflow syntax.

Install with:
  brew install actionlint          # macOS (Homebrew)
  go install github.com/rhysd/actionlint/cmd/actionlint@latest  # Go

actionlint is optional but enables /shipyard:ci-validate for deep workflow analysis.
```

Only suggest tools relevant to the detected platform. Do not suggest `hadolint` if there is no Dockerfile.

### Step 4: Query Context7 for CI/CD Docs

**Query from the main conversation** -- MCP tool permissions are session-scoped and not delegated to subagents.

#### Freshness check (skip recent docs)

Before querying Context7 for a topic, check if a generated doc already exists:

```bash
stat -f "%m" {file} 2>/dev/null || stat -c "%Y" {file} 2>/dev/null
```

- **If the doc exists and is < 7 days old**: skip. Report: "{topic} docs are fresh ({N} days old) -- skipping"
- **If the doc exists and is >= 7 days old**: regenerate
- **If `--force` is passed**: regenerate docs >= 7 days old. Docs < 7 days old are STILL skipped
- **If the doc doesn't exist**: generate it

#### Create directory structure

```
.claude/ci/
├── generated/                  <- Context7-sourced CI/CD reference docs
│   ├── github-actions.md       <- if GitHub Actions detected
│   ├── docker-best-practices.md <- if Dockerfile detected
│   ├── vercel-deployment.md    <- if Vercel detected
│   └── ...
└── project/                    <- team-written CI/CD conventions
    └── (user-created files)
```

#### Query plan

Based on detected platforms, build the query list:

| Detected | Library to resolve | Query focus |
|----------|-------------------|-------------|
| GitHub Actions | `github-actions` | Workflow syntax, caching, matrix, concurrency, permissions, reusable workflows |
| GitLab CI | `gitlab-ci` | Pipeline syntax, stages, artifacts, caching, rules |
| Vercel | `vercel` | Deployment config, preview deployments, environment variables, edge functions |
| Netlify | `netlify` | Build settings, redirects, functions, environment variables |
| Docker | `docker` | Multi-stage builds, layer caching, security hardening, .dockerignore |
| Kubernetes | `kubernetes` | Deployments, services, probes, resource limits, rolling updates |
| Fly.io | `fly-io` | fly.toml config, scaling, regions, secrets |
| Railway | `railway` | Deployment config, environment variables, services |

**Process one library at a time** (same anti-fabrication pattern as Composure):

1. **Resolve**: Call `resolve-library-id` with the library name
2. **Query**: Call `query-docs` with focus areas specific to CI/CD patterns
3. **Write the doc immediately** to `.claude/ci/generated/{platform}.md`
4. Move to the next library

**MUST rules:**
- MUST source ALL content from Context7 results. NEVER use training data.
- MUST include a valid `context7_library_id` in a frontmatter comment at the top of each doc.
- MUST NOT fabricate. If Context7 returns nothing after 3 attempts, skip the library.
- If `--skip-context7` is passed, skip this entire step.

### Step 5: Generate Config

Create `.claude/shipyard.json`:

```json
{
  "version": "1.0.0",
  "detectedAt": "2026-03-27",
  "ci": {
    "platform": "github-actions",
    "workflowDir": ".github/workflows",
    "existingWorkflows": ["ci.yml", "deploy.yml"],
    "nodeVersion": "22",
    "packageManager": "pnpm"
  },
  "deployment": {
    "targets": ["vercel"],
    "containerized": false,
    "hasDockerfile": false,
    "hasDockerCompose": false,
    "hasKubernetes": false,
    "hasTerraform": false
  },
  "tools": {
    "actionlint": "1.7.0",
    "act": null,
    "hadolint": null,
    "docker": "27.0.0",
    "kubectl": null,
    "terraform": null,
    "vercel": "39.0.0",
    "gh": "2.65.0"
  },
  "stack": {
    "framework": "nextjs",
    "packageManager": "pnpm",
    "nodeVersion": "22",
    "hasTypecheck": true,
    "hasLint": true,
    "hasTests": true,
    "testCommand": "pnpm test",
    "buildCommand": "pnpm build"
  },
  "composureIntegration": true,
  "sentinelIntegration": true
}
```

Field notes:
- `ci.platform` -- the primary CI platform (the one that runs the pipeline). Use the first detected CI platform.
- `deployment.targets` -- array of ALL detected deployment targets (can be multiple)
- `tools` -- record version string if installed, `null` if not
- `composureIntegration` -- true if `.claude/no-bandaids.json` exists
- `sentinelIntegration` -- true if `.claude/sentinel.json` exists

If `--dry-run`, print the JSON to stdout without writing.

If the file already exists and `--force` is not passed, skip generation:

```
.claude/shipyard.json already exists. Use --force to overwrite.
```

### Step 6: Ensure tasks-plans Directory

If `tasks-plans/tasks.md` does not exist, create it (same format as Composure for interoperability):

```markdown
# CI/CD Tasks

> Auto-populated by Shipyard skills and hooks. Process with /composure:review-tasks or resolve inline.

## Critical

## High

## Moderate
```

If it already exists (Composure or Sentinel created it), leave it untouched.

### Step 7: Report

```
Shipyard initialized for <project-name>

Stack:
  - TypeScript / Next.js
  - Package manager: pnpm
  - Node: 22
  - Build: pnpm build | Test: pnpm test | Lint: yes | Typecheck: yes

CI/CD platform:
  - Primary: GitHub Actions
  - Workflows: ci.yml, deploy.yml

Deployment targets:
  - Vercel (vercel.json detected)

Container:
  - Dockerfile: no
  - Docker Compose: no
  - Kubernetes: no

Tooling:
  - actionlint: 1.7.0
  - docker: 27.0.0
  - vercel: 39.0.0
  - gh: 2.65.0
  - hadolint: not installed (no Dockerfile — not needed)

Generated:
  - .claude/shipyard.json
  - .claude/ci/generated/ (CI/CD reference docs)

Composure integration: yes (.claude/no-bandaids.json found)
Sentinel integration: yes (.claude/sentinel.json found)

Active hooks:
  - PreToolUse: ci-syntax-guard (validates CI config on Edit|Write)
  - PreToolUse: dockerfile-guard (validates Dockerfiles on Edit|Write)
  - SessionStart: init-check (suggests /shipyard:initialize if not configured)

Available skills:
  /shipyard:ci-generate   -- Generate CI/CD workflow from detected stack
  /shipyard:ci-validate   -- Validate existing CI/CD workflows
  /shipyard:deps-check    -- Dependency health audit (CVEs + outdated)
  /shipyard:dockerfile    -- Generate or validate Dockerfiles
  /shipyard:preflight     -- Production readiness checklist
```

## Notes

- This skill is idempotent -- running it again updates detection results
- With `--force`, it overwrites the existing config and regenerates stale CI docs
- With `--dry-run`, it prints what would be generated without writing
- With `--skip-context7`, it skips Context7 queries (CI docs not generated)
- Composure and Sentinel configs are read but never modified -- Shipyard is a consumer, not a producer
- `.claude/ci/project/` is for team-written CI/CD conventions -- never auto-generated
- Tool suggestions are platform-aware: only suggest tools relevant to detected CI/deployment targets
