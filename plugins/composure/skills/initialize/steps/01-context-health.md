# Step 1: Context Health Check

**Run this BEFORE installing anything.** Understand the current plugin/MCP load so you don't make it worse.

Count plugins and MCP servers. If the total is high, advise the user before proceeding with companion installs in Step 3.

```bash
claude plugin list 2>/dev/null   # count enabled vs disabled
claude mcp list 2>/dev/null      # count MCP servers
```

**Thresholds depend on context window size:**

| Context Window | Enabled Plugins | MCP Servers | Advisory |
|----------------|----------------|-------------|----------|
| 200K (default) | 6+ | 5+ | Warn: context is tight, disable unused plugins |
| 500K | 10+ | 8+ | Note: getting heavy, consider disabling unused |
| 1M | 15+ | 12+ | Note: lots loaded, mention if performance dips |

Claude knows its own context window from the system prompt. Use that to pick the right threshold.

**What to report:**

```
Context health:
  Enabled plugins: {N} ({M} disabled)
  MCP servers: {K}
  Context window: {size}
  {advisory if threshold exceeded, otherwise nothing}
```

If threshold exceeded, be transparent about what's injecting into context:

1. List enabled plugins grouped by marketplace
2. For each enabled plugin, note what it injects: hooks (PreToolUse/PostToolUse/SessionStart), skills, MCP servers
3. Flag which plugins are actively adding overhead to every tool call (PreToolUse hooks fire on EVERY Edit/Write)

Example:
```
Context health:
  Enabled plugins: 15 (9 disabled)
  MCP servers: 10
  Context window: 1M

  Active on every Edit/Write (PreToolUse hooks):
    composure: no-bandaids, decomposition-guide, type-safety, architecture-trigger
    sentinel: secret-guard, insecure-pattern-guard
    design-forge: canvas-guard
    expo-app-design: expo-conventions

  Active on session start:
    composure: init-check, resume-check
    sentinel: dep-freshness-check, init-check
    shipyard: init-check
    testbench: init-check

  Not relevant to this project (consider disabling for this session):
    expo-app-design, expo-deployment, upgrading-expo — no Expo detected in this project
```

The key: show the user what's running on every keystroke. They can then decide what stays. Use `claude plugin disable <name>` for plugins not relevant to the current project.

**Gating companion installs:** If at or above threshold, Step 3 (Companion Triage) should present installs as opt-in rather than auto-installing. Store the health status for Step 3 to reference:

```json
{
  "atThreshold": true,
  "enabledPlugins": 12,
  "mcpServers": 8,
  "contextWindow": "1M"
}
```

---

**Next:** Read `steps/02-mcp-setup.md`
