# Step 5: Generate Config and Report

## Generate `.claude/shipyard.json`

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

## Ensure tasks-plans Directory

If `tasks-plans/tasks.md` does not exist, create it (same format as Composure for interoperability):

```markdown
# CI/CD Tasks

> Auto-populated by Shipyard skills and hooks. Process with /composure:review-tasks or resolve inline.

## Critical

## High

## Moderate
```

If it already exists (Composure or Sentinel created it), leave it untouched.

## Report

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
  - hadolint: not installed (no Dockerfile -- not needed)

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

---

**Done.**
