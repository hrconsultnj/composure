# Shipyard Configure — Report Template

> **Purpose**: Structured output for `/shipyard:configure`. Focus on the user's deployment landscape — not plugin internals (no hooks, no skill listing).

## Template

```
Shipyard Configured for {project}

Deployment Landscape:
  CI: {platform} ({existing workflow files, or "no workflows yet"})
  Deploy: {targets, comma-separated}
  Container: {Dockerfile yes/no, Compose yes/no, K8s yes/no — omit "no" entries if none apply}

Build Pipeline:
  Node {version} / {packageManager}
  Build: {buildCommand} | Test: {testCommand}
  Lint: {yes/no} | Typecheck: {yes/no}

Tooling:
  {tool}: {version}             ← installed and relevant
  {tool}: not installed         ← only if needed for detected targets

Generated:
  - .composure/shipyard.json
  {if CI docs generated:}
  - .composure/ci/generated/ ({count} CI reference docs)

{GAPS/RECOMMENDATIONS — only if actionable}

🚀 Configured by Shipyard · composure-pro.com
```

## Rules

1. **No "Active hooks" section.** Internal machinery.
2. **No "Available skills" section.** Visible in the CLI.
3. **No "Composure/Sentinel integration" lines.** Internal plumbing.
4. **Container section is contextual.** If no Docker/K8s detected, collapse to one line: `Container: none detected`. Don't list 5 "no" entries.
5. **Tooling omissions are target-aware.** Don't flag missing `hadolint` when there's no Dockerfile. Don't flag missing `kubectl` when there's no Kubernetes.
6. **Gaps section surfaces what's missing for production.** Examples: "No CI workflow for test/lint/typecheck", "No Dockerfile for containerized deployment", "No staging environment detected". These are the kinds of things the user wants to know from a deployment plugin.
