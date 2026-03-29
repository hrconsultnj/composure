# Step 9: Context Health Advisory

After everything is set up, check whether the user's environment has too many plugins or MCP servers that could degrade Claude's performance.

Count plugins and MCP servers. If the total is high, advise the user:

```
Context health check:
  Plugins loaded: {N}
  MCP servers: {M}

  {If N > 10 or M > 8}:
  Tip: You have a lot of plugins and MCP servers active. Each one adds
  instructions and tool definitions to Claude's context, which can cause
  slower responses and missed details. Consider disabling plugins you're
  not using in this project: claude plugin disable <name>

  If Claude seems unfocused, check if third-party plugins are injecting
  large system prompts or "YOU MUST" instructions that compete with your
  project's CLAUDE.md.
```

Run `claude plugin list` and count **enabled** plugins (ignore disabled ones — they don't inject context).

Also run `claude mcp list` and count MCP servers.

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

---

**Next:** Read `steps/10-claude-md-offer.md`
