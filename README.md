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

## Licensing

- **Composure** — [PolyForm Noncommercial 1.0.0](plugins/composure/LICENSE) (free for personal use). [Pro license ($39)](https://composure.lemonsqueezy.com) for commercial use + battle-tested data architecture patterns.
- **Design Forge** — [PolyForm Noncommercial 1.0.0](plugins/design-forge/LICENSE) (free for personal use).

See each plugin's directory for full documentation.
