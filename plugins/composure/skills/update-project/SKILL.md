---
name: update-project
description: Refresh Composure config, hooks, or reference docs without full re-initialization. Targets only what changed.
argument-hint: "[docs] [hooks] [stack] [all]"
---

# Composure Update Project

Lightweight refresh for an already-initialized project. Unlike `/initialize`, this skips first-time setup (Context7 install, task queue creation, graph bootstrap) and only updates what's stale or explicitly requested.

**Requires**: `.claude/no-bandaids.json` must exist. If it doesn't, run `/initialize` first.

## Arguments

| Argument | What it updates |
|---|---|
| `docs` | Re-query Context7 for reference docs. Regenerates files in `generated/` directories |
| `hooks` | Sync hooks from the plugin to the project's hook config |
| `stack` | Re-detect the project stack and update `.claude/no-bandaids.json` |
| `all` | All of the above |
| *(no argument)* | Same as `all` |

Arguments can be combined: `/update-project docs hooks`

## Workflow

### Step 1: Validate bootstrap

1. Check `.claude/no-bandaids.json` exists
2. If missing → stop with: "Project not initialized. Run `/composure:initialize` first."
3. Read the current config — this is the baseline for diffing

### Step 2: Re-detect stack (if `stack` or `all`)

Run the same detection logic as `/initialize` Step 1, but instead of writing from scratch:

1. Detect the current stack from `package.json`, `tsconfig.json`, etc.
2. **Diff** against the existing `.claude/no-bandaids.json`
3. Report what changed:
   - New dependencies detected (e.g., added `tanstack-query`)
   - Version bumps (e.g., `react 19.2 → 19.3`)
   - Removed dependencies
   - Framework changes (e.g., `vite → nextjs`)
4. **Update** `.claude/no-bandaids.json` with the new values
5. If nothing changed → report "Stack unchanged" and skip

### Step 3: Update reference docs (if `docs` or `all`)

Compare the detected stack (from Step 2, or from existing config if `stack` was skipped) against what's already in `generated/` directories.

**Determine the root:**
- Composure plugin repo (has `skills/app-architecture/`) → `skills/app-architecture/`
- User project → `.claude/frameworks/`

**Diff logic:**

1. List all `generated/` directories under the root
2. For each expected library (from the mapping in `/initialize` Step 3b):
   - If the doc **doesn't exist** → query Context7 and create it
   - If the doc **exists but the version changed** (compare `library_version` in frontmatter vs detected version) → re-query and overwrite
   - If the doc **exists and version matches** → skip
3. For docs that exist but the library is **no longer detected** → report as orphaned (don't delete — the user may have added them manually)

**Query Context7 from the main conversation** (same as `/initialize` — MCP permissions aren't delegated to subagents). Batch `resolve-library-id` calls, then batch `query-docs` calls.

Follow the filename convention from `GENERATED-DOC-TEMPLATE.md` — priority-numbered prefixes (`{NN}-{name}.md`).

**Report:**
```
Reference docs:
  + Created: frontend/generated/05-tanstack-query-5.90.md (new dependency)
  ~ Updated: frontend/generated/01-typescript-5.9.md (5.8 → 5.9)
  = Unchanged: frontend/generated/03-tailwind-4.md
  ? Orphaned: sdks/generated/03-stripe-v15.md (stripe no longer in dependencies)
```

### Step 4: Sync hooks (if `hooks` or `all`)

The plugin ships hooks in `hooks/hooks.json`. Projects may need hook updates when:
- The plugin added new hooks
- Hook scripts were updated
- The project stack changed (e.g., new language needs new no-bandaids rules)

**Sync logic:**

1. Read the plugin's `hooks/hooks.json` (at `${CLAUDE_PLUGIN_ROOT}/hooks/hooks.json`)
2. Check if the project has a local hooks override at `.claude/settings.json` or `.claude/settings.local.json`
3. **If the project uses plugin hooks directly** (no local overrides) → nothing to sync, the plugin hooks are always current
4. **If the project has local hook overrides** → compare and report differences:
   ```
   Hooks:
     ~ Updated: decomposition-check.sh (plugin version newer)
     + New: type-safety-reviewer (added in plugin, not in project)
     = Unchanged: no-bandaids.sh, graph-update.sh
   ```
5. Don't auto-overwrite local hook overrides — report the diff and let the user decide

### Step 5: Report

Print a concise summary. Only show sections that had changes.

```
Composure updated for <project-name>

Stack: typescript 5.9, react 19.3 (↑ 19.2), vite 8.0, tailwind 4.2, shadcn 4.1
  ~ react version bumped 19.2 → 19.3

Docs: 2 updated, 1 created, 4 unchanged
  + frontend/generated/05-tanstack-query-5.90.md
  ~ frontend/generated/02-react-19.md (19.2 → 19.3)

Hooks: no changes (using plugin hooks directly)
```

If nothing changed at all:
```
Composure: everything up to date.
```
