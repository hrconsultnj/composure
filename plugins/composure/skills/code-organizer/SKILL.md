---
name: code-organizer
description: Restructure a messy project into conventional file layout based on detected framework. Analyzes, plans, executes with import updates, and verifies.
argument-hint: "[--dry-run] [--aggressive] [--naming kebab|camel|pascal] [--preserve path,path] [--no-graph]"
---

# Code Organizer

Restructure a disorganized project into a clean, conventional file layout. Detects what each file is (component, hook, type, service, utility), maps it to the right directory for the detected framework, and executes the moves with import path updates.

## Arguments

- `--dry-run` — Show reorganization plan only, don't execute
- `--aggressive` — Also split large files (>300 lines) and extract shared utilities using decomposition patterns from `app-architecture/frontend/typescript/01-component-decomposition.md`
- `--naming kebab|camel|pascal` — Enforce file naming convention (default: detect dominant convention in project)
- `--preserve path,path` — Comma-separated paths to skip entirely (user's intentional structure)
- `--no-graph` — Use grep-based import scanning instead of the graph. **Only valid with `--dry-run`** — actual file moves always require the graph

## Workflow

**Read each step file in order. Do NOT skip steps. Each step ends with "Next: read step X."**

| Step | File | What it does |
|------|------|-------------|
| 0 | `steps/00-gate.md` | Read config, ensure graph exists, auto-fix chain |
| 1 | `steps/01-load-conventions.md` | Read conventions.md, extract matching framework section |
| 2 | `steps/02-analyze.md` | 8 checks: directory inventory, misplaced files, mixed concerns, missing dirs, naming, feature folders, import deps, root clutter |
| 3 | `steps/03-plan.md` | Generate reorganization plan, present to user, wait for approval |
| 4 | `steps/04-execute.md` | Execute moves (git mv), update imports, handle barrels, aliases, renames, aggressive mode |
| 5 | `steps/05-verify.md` | Typecheck, lint, handle failures, rebuild graph, prompt commit |

**Start by reading:** `steps/00-gate.md`

## Key Constraints

- **The code graph is required** — it provides exact import data so moves don't break things. The skill auto-builds it if the MCP server is running but no graph exists yet. `--no-graph` is only valid with `--dry-run` for analysis.
- **Windows compatible** — use `grep -E` not `grep -P` throughout.

## Tips

- **Run `/composure:initialize` first** if you haven't — code-organizer needs the stack detection config
- **Start with `--dry-run`** to preview what would change before committing to it
- **Use `--preserve`** for directories you've intentionally organized differently
- **After organizing**, `/decomposition-audit` can catch remaining size violations within the now-properly-placed files
- **For new features going forward**, `/app-architecture` will guide you to put things in the right place from the start
