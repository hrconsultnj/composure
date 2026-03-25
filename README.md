# HR Claude Plugins

Claude Code plugins by [HR Business Consulting](https://github.com/hrconsultnj) — code quality enforcement, architecture patterns, and premium design.

> **⚠️ Important:** Make sure you trust a plugin before installing, updating, or using it. Anthropic does not control what MCP servers, files, or other software are included in plugins and cannot verify that they will work as intended or that they won't change. See each plugin's directory for more information.

## Plugins

| Plugin | Description | Category |
|--------|-------------|----------|
| **[Composure](plugins/composure/)** | Code quality enforcement — decomposition hooks, architecture skills, code review graph, severity-tracked task queue. 7 languages. | Development |
| **[Design Forge](plugins/design-forge/)** | Premium web design patterns — 33 production components, canvas presets, animation recipes, 3D integration, accessibility, AI design research. | Design |

## Installation

```bash
# Add the marketplace
claude plugin marketplace add hrconsultnj/claude-plugins

# Install plugins
claude plugin install composure@my-claude-plugins
claude plugin install design-forge@my-claude-plugins

# Initialize Composure in your project
/composure:initialize
```

## Quick Start

### Composure

```
/composure:initialize            # Detect stack, build graph, generate config
/composure:app-architecture      # Feature-building guide — framework-specific refs
/composure:commit                # Commit with auto task queue hygiene + graph update
/composure:decomposition-audit   # Full codebase scan for size violations
/composure:review-tasks          # Process task queue (verify, delegate, archive)
/composure:review-pr             # PR review with blast-radius analysis
/composure:review-delta          # Review changes since last commit
/composure:build-graph           # Build/update code review knowledge graph
/composure:update-project        # Refresh config, hooks, or docs without full re-init
```

### Design Forge

```
/design-forge                    # Browse and apply premium web design patterns
/ux-researcher                   # Research design patterns and competitors
```

## Troubleshooting

### Reinstall a plugin

```bash
# Uninstall
claude plugin uninstall composure
# Reinstall
claude plugin install composure@my-claude-plugins
# Restart Claude Code (exit and reopen)
```

### Code review graph not working

Composure's code graph requires **Node.js 22.5+**. Check with `node --version`.

If Node is fine but the graph still doesn't work, run `/composure:initialize` — it will auto-register the server and survive future plugin updates.

Or register manually:

```bash
# Find your plugin path
COMPOSURE_PATH=$(claude plugin list --json | node -e "
  const p = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  const c = p.find(x => x.id.startsWith('composure') && x.enabled);
  if (c) console.log(c.installPath);
")

# Copy launcher to stable location + register
cp "$COMPOSURE_PATH/scripts/launch-graph-server.sh" ~/.claude/plugins/composure-graph-launcher.sh
chmod +x ~/.claude/plugins/composure-graph-launcher.sh
claude mcp add composure-graph -- bash ~/.claude/plugins/composure-graph-launcher.sh

# Restart Claude Code
```

### Graph stops working after plugin update

After `claude plugin update composure`, just restart Claude Code (Ctrl+C → `claude`). The launcher resolves the latest cached version at startup — no re-registration needed.

### Remove everything (full reset)

```bash
# Remove plugins
claude plugin uninstall composure
claude plugin uninstall design-forge

# Remove the MCP server (if registered)
claude mcp remove composure-graph

# Remove the marketplace
claude plugin marketplace remove my-claude-plugins
```

## Licensing

- **Composure** — [PolyForm Noncommercial 1.0.0](plugins/composure/LICENSE) (free for personal use). [Pro license ($39)](https://composure.lemonsqueezy.com) for commercial use + battle-tested data architecture patterns.
- **Design Forge** — [PolyForm Noncommercial 1.0.0](plugins/design-forge/LICENSE) (free for personal use).

See each plugin's directory for full documentation.
