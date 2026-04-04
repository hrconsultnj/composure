# Sentinel Assess — Report Template

> **Purpose**: Structured output for `/sentinel:assess`. Focus on the user's project security surface — not plugin internals (no hooks, no skill listing).

## Template

```
Sentinel Assessed for {project}

Security Surface:
  {language} {version} / {framework}
  Lockfile: {lockfileType}
  Package manager: {preferred} {version}

Integrations ({count}):
┌──────────────┬─────────┬─────────────────────────┬────────────────────────────┐
│ Integration  │  Risk   │ Package (version)       │ Secret patterns            │
├──────────────┼─────────┼─────────────────────────┼────────────────────────────┤
│ {name}       │ {level} │ {pkg}                   │ {patterns}                 │
└──────────────┴─────────┴─────────────────────────┴────────────────────────────┘

  Risk levels: high = handles payments/auth/PII, moderate = external API, low = utility

Security Tooling:
  {tool}: {version}             ← installed
  {tool}: not installed         ← only show if relevant to detected stack

Generated:
  - .claude/sentinel.json
  - .claude/security/integrations.json ({count} integrations)
  {if security docs generated:}
  - .claude/security/generated/ ({count} docs for detected integrations)

{WARNINGS — only if actionable issues found}

🛡️ Assessed by Sentinel · composure-pro.com
```

## Rules

1. **No "Active hooks" section.** Users know hooks exist. Listing them is internal machinery.
2. **No "Available skills" section.** Users see skills in the CLI skill list.
3. **No "Composure integration: yes/no".** Cross-plugin awareness is internal plumbing.
4. **Risk column is required.** Every integration gets a risk level — this is the value Sentinel adds over a raw dependency list.
5. **Secret patterns column is required.** Show the prefixes Sentinel watches for (sk_live_, re_, DSN, etc.).
6. **Warnings section only if actionable.** Missing semgrep on a project with zero source files is not actionable. Missing semgrep on a TypeScript monorepo IS actionable.
7. **Tooling omissions are contextual.** Don't report `govulncheck: not installed` for a TypeScript project. Only show missing tools that matter for the detected stack.
