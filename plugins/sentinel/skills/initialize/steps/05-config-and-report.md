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

Print the initialization summary:

```
Sentinel initialized for <project-name>

Stack:
  - TypeScript / Next.js
  - Lockfile: pnpm-lock.yaml

Package managers:
  - Preferred: pnpm 10.6.2
  - Available: pnpm, npm

System installers:
  - Preferred: brew 4.5.2

Security tooling:
  - Semgrep: 1.108.0
  - Trivy: not installed
  - Grype: not installed

Integrations detected:
  - Stripe (@stripe/stripe-node 17.5.0) — sk_live_, sk_test_, rk_live_, rk_test_
  - Supabase (@supabase/supabase-js 2.93.0) — service_role, anon_key
  - OpenAI (openai 5.1.0) — sk-, sk-proj-
  - Sentry (@sentry/nextjs 9.5.0) — DSN
  - Resend (resend 4.2.0) — re_

Generated:
  - .claude/sentinel.json
  - .claude/security/integrations.json (5 integrations)
  - .claude/security/generated/ (security docs for detected integrations)

Composure integration: yes (.claude/no-bandaids.json found)

Active hooks:
  - PreToolUse: secret-guard (19 patterns), insecure-pattern-guard (22 patterns), dep-guard (package safety)
  - SessionStart: dep-freshness-check (24h CVE cache + banned list staleness)

Available skills:
  /sentinel:scan        — Full security scan (Semgrep + dependency audit)
  /sentinel:audit-deps  — Focused dependency CVE audit
  /sentinel:headers     — HTTP security header analysis
```

---

**Done.**
