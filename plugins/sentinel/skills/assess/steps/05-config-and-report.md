# Step 5: Generate Config and Report

## Generate `.claude/sentinel.json`

Create `.claude/sentinel.json`:

```json
{
  "version": "1.0.0",
  "detectedAt": "2026-03-27T12:00:00Z",
  "project": {
    "language": "typescript",
    "framework": "nextjs",
    "lockfileType": "pnpm-lock.yaml"
  },
  "packageManagers": {
    "preferred": "pnpm",
    "available": {
      "pnpm": "10.6.2",
      "npm": "10.9.0",
      "bun": null,
      "yarn": null
    }
  },
  "systemInstallers": {
    "preferred": "brew",
    "available": {
      "brew": "4.5.2",
      "apt": null,
      "choco": null
    }
  },
  "securityTools": {
    "semgrep": "1.108.0",
    "trivy": null,
    "grype": null,
    "pipAudit": null,
    "govulncheck": null
  },
  "composureIntegration": true,
  "integrations": ["stripe", "supabase", "openai", "sentry", "resend"],
  "integrationsConfigPath": ".claude/security/integrations.json",
  "staleness": {
    "patternsGeneratedAt": "2026-03-27",
    "thresholdDays": {
      "typescript": 30,
      "python": 60,
      "go": 90,
      "rust": 90
    },
    "note": "Aggressive freshness — max 90 days for any language. In the age of AI, frontend surfaces change monthly, server patterns quarterly. Stale security advice is worse than an extra Context7 query."
  }
}
```

If `--dry-run`, print the JSON to stdout without writing.

If the file already exists and `--force` is not passed, skip generation:

```
.claude/sentinel.json already exists. Use --force to overwrite.
```

## Ensure tasks-plans Directory

If `tasks-plans/tasks.md` does not exist, create it (same as Composure format for interoperability):

```markdown
# Security Tasks

> Auto-populated by Sentinel hooks and scans. Process with /sentinel:scan or /sentinel:audit-deps.

## Critical

## High

## Moderate
```

If it already exists (Composure created it), leave it untouched.

## Report

**Read the report template** at `templates/assess-report.md` (relative to the plugin root: `plugins/sentinel/templates/assess-report.md`). Follow the template structure and rules exactly. Fill in placeholders with actual detected values from the steps above.

Key: the template focuses on the user's project security surface — integrations, risk levels, secret patterns, tooling gaps. It explicitly excludes hooks, skill listings, and cross-plugin integration lines.

---

**Done.**
