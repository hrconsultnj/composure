# HR Claude Plugins

Claude Code plugins by [HR Business Consulting](https://github.com/hrconsultnj) — code quality, security, architecture, and premium design.

> **Warning:** Make sure you trust a plugin before installing, updating, or using it. Anthropic does not control what MCP servers, files, or other software are included in plugins and cannot verify that they will work as intended or that they won't change. See each plugin's directory for more information.

## Plugins

| Plugin | Category | Description | Status |
|--------|----------|-------------|--------|
| **[Composure](plugins/composure/)** | Development | Code quality enforcement — decomposition hooks, architecture skills, code review graph, severity-tracked task queue. 7 languages. | Stable |
| **[Design Forge](plugins/design-forge/)** | Design | Premium web design patterns — 33 production components, canvas presets, animation recipes, 3D integration, accessibility. | Stable |
| **[Sentinel](plugins/sentinel/)** | Security | Local-first security scanning — SAST, secret detection, dependency audit, HTTP header analysis. No cloud auth required. | New |
| **[Testbench](plugins/testbench/)** | Testing | Convention-aware test generation, running, coverage nudges. Reads existing tests to match your project style. | New |
| **Shipyard** | DevOps | CI/CD generation, Dockerfile validation, deployment config, production readiness checks. | Planned |

## How They Work Together

```
Composure (foundation)
  ├── .claude/no-bandaids.json      ← All plugins read this for stack detection
  ├── tasks-plans/tasks.md          ← All plugins write findings here
  ├── /composure:commit             ← Blocks on Critical findings from ANY plugin
  └── composure-graph MCP           ← Testbench uses for coverage intelligence

Sentinel (security layer)
  ├── secret-guard.sh               ← Blocks exposed secrets on every Edit/Write
  ├── insecure-pattern-guard.sh     ← Blocks insecure code patterns (22 patterns, 4 languages)
  └── /sentinel:scan                ← Full SAST + dependency audit → tasks-plans/

Design Forge (design layer)
  └── /design-forge                 ← Premium components adapted to your stack

Testbench (testing layer)
  ├── test-coverage-nudge.sh        ← Nudges when editing untested files (session-deduped)
  ├── /testbench:initialize         ← Detect test framework + learn project conventions
  ├── /testbench:generate           ← Convention-aware test generation (reads existing tests first)
  └── /testbench:run                ← Run tests, parse failures with source context

Shipyard (deployment layer) — planned
  ├── ci-syntax-guard.sh            ← Validates CI config on every edit
  └── /shipyard:ci-generate         ← GitHub Actions workflow from detected stack
```

## Installation

```bash
# Add the marketplace
claude plugin marketplace add hrconsultnj/claude-plugins

# Install plugins (pick what you need)
claude plugin install composure@my-claude-plugins
claude plugin install design-forge@my-claude-plugins
claude plugin install sentinel@my-claude-plugins
claude plugin install testbench@my-claude-plugins

# Initialize in your project
/composure:initialize              # Stack detection, graph, config
/sentinel:initialize               # Security config, tool detection
/testbench:initialize              # Test framework detection, conventions
```

## Quick Start

### Composure

```
/composure:initialize            # Detect stack, build graph, generate config
/composure:app-architecture      # Feature-building guide — framework-specific refs
/composure:commit                # Commit with auto task queue hygiene + graph update
/composure:decomposition-audit   # Full codebase scan for size violations + ghost duplicates
/composure:review-tasks          # Process task queue (verify, delegate, archive)
/composure:review-pr             # PR review with blast-radius analysis
/composure:review-delta          # Review changes since last commit
/composure:build-graph           # Build/update code review knowledge graph
/composure:code-organizer        # Restructure project layout to framework conventions
/composure:update-project        # Refresh config, hooks, or docs without full re-init
```

### Sentinel

```
/sentinel:initialize             # Detect stack, install security tools, generate config
/sentinel:scan                   # Full SAST (Semgrep) + dependency audit
/sentinel:audit-deps             # Focused dependency vulnerability scan
/sentinel:headers                # HTTP security header analysis (context-aware grading)
```

Sentinel also runs automatically via hooks:
- **secret-guard** — blocks exposed secrets on every Edit/Write (19 patterns: AWS, GitHub, Stripe, SSH keys, JWTs, Supabase service_role, and more)
- **insecure-pattern-guard** — blocks insecure code patterns (eval, innerHTML, SQL injection, command injection across TypeScript, Python, Go, Rust)
- **dep-freshness-check** — checks for known CVEs on session start

### Testbench

```
/testbench:initialize            # Detect test framework, learn project conventions
/testbench:generate <file>       # Generate tests matching your project style
/testbench:run [all|changed]     # Run tests, parse failures with source context
```

Testbench also runs automatically via hooks:
- **test-coverage-nudge** — when you edit a source file with no tests, suggests `/testbench:generate` (once per file per session)

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
claude plugin uninstall sentinel
claude plugin uninstall testbench

# Remove the MCP server (if registered)
claude mcp remove composure-graph

# Remove the marketplace
claude plugin marketplace remove my-claude-plugins
```

## Licensing

- **Composure** — [PolyForm Noncommercial 1.0.0](plugins/composure/LICENSE) (free for personal use). [Pro license ($39)](https://composure.lemonsqueezy.com) for commercial use + battle-tested data architecture patterns.
- **Design Forge** — [PolyForm Noncommercial 1.0.0](plugins/design-forge/LICENSE) (free for personal use).
- **Sentinel** — [PolyForm Noncommercial 1.0.0](plugins/sentinel/LICENSE) (free for personal use).
- **Testbench** — [PolyForm Noncommercial 1.0.0](plugins/testbench/LICENSE) (free for personal use).

See each plugin's directory for full documentation.
