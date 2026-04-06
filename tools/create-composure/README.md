# create-composure

Install [Composure](https://composure-pro.com) — universal code quality enforcement for AI coding tools.

## Quick Start

```bash
pnpm dlx create-composure
```

Also works with `bunx create-composure` or `npx create-composure`.

## What It Does

One command handles everything:

1. **Checks Node.js** — requires 22.5+ for the code graph
2. **Detects your AI tools** — Claude Code, Cursor, Windsurf, Gemini, Codex, Aider, Cline, Roo
3. **Installs plugins** — Composure, Sentinel, Shipyard, Testbench, Design Forge
4. **Authenticates** — opens browser for OAuth login (no separate step needed)
5. **Sets up ~/.composure/** — global config, CLI binaries, cache
6. **Generates adapters** — rules files for non-Claude tools (Cursor, Windsurf, etc.)

## Options

```
--skip-auth          Skip authentication (do it later via /composure:auth login)
--skip-claude        Don't offer to install Claude Code
--skip-adapters      Don't generate rules files for non-Claude tools
--plugins <list>     Comma-separated plugin list
--non-interactive    Accept all defaults, no prompts (for CI/scripts)
```

## After Install

Open any project in Claude Code — Composure auto-initializes. Or run `/composure:initialize` for deep stack detection.

## Links

- [Documentation](https://composure-pro.com/docs)
- [GitHub](https://github.com/hrconsultnj/claude-plugins)
