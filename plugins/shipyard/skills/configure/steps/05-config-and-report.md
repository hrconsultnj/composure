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

> Auto-populated by Shipyard skills and hooks. Process with /composure:backlog or resolve inline.

## Critical

## High

## Moderate
```

If it already exists (Composure or Sentinel created it), leave it untouched.

## Report

**Read the report template** at `templates/configure-report.md` (relative to the plugin root: `plugins/shipyard/templates/configure-report.md`). Follow the template structure and rules exactly. Fill in placeholders with actual detected values from the steps above.

Key: the template focuses on the user's deployment landscape — CI platform, deploy targets, build pipeline, tooling gaps. It explicitly excludes hooks, skill listings, and cross-plugin integration lines.

---

**Done.**
