---
name: update-project
description: Refresh Composure config, hooks, or reference docs without full re-initialization. Targets only what changed.
argument-hint: "[config] [docs] [hooks] [stack] [all]"
---

# Composure Update Project

Lightweight refresh for an already-initialized project. Unlike `/initialize`, this skips first-time setup (Context7 install, task queue creation, graph bootstrap) and only updates what's stale or explicitly requested.

**Requires**: `.claude/no-bandaids.json` must exist. If it doesn't, run `/initialize` first.

## Arguments

| Argument | What it updates |
|---|---|
| `config` | Refresh `no-bandaids.json`: stamp `composureVersion`, regenerate project `frameworkValidation` rules from generated docs, report active plugin defaults |
| `docs` | Re-query Context7 for reference docs. Regenerates files in `generated/` directories |
| `hooks` | Sync hooks from the plugin to the project's hook config |
| `stack` | Re-detect the project stack and update `.claude/no-bandaids.json` |
| `all` | All of the above |
| *(no argument)* | Same as `all` |

Arguments can be combined: `/update-project config docs`

## Workflow

### Step 1: Validate bootstrap

1. Check `.claude/no-bandaids.json` exists
2. If missing → stop with: "Project not initialized. Run `/composure:initialize` first."
3. Read the current config — this is the baseline for diffing

### Step 2: Refresh config (if `config` or `all`)

Updates `.claude/no-bandaids.json` to sync with the current plugin version and regenerate project-specific `frameworkValidation` rules.

**2a. Stamp `composureVersion`**

Extract the plugin version from `$CLAUDE_PLUGIN_ROOT` path and write it to the config:

```bash
PLUGIN_VERSION=$(echo "$CLAUDE_PLUGIN_ROOT" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | tail -1)
```

Update `composureVersion` in `.claude/no-bandaids.json`. If it doesn't exist, add it. This enables the `init-check.sh` freshness check to detect when the project config is stale.

**2b. Report active plugin defaults**

Read each file in `${CLAUDE_PLUGIN_ROOT}/defaults/` that would be loaded for this project's detected stack (same logic as `no-bandaids.sh` Layer 1). Count and report:

```
Plugin defaults active for this stack:
  shared.json: 10 rules (always loaded)
  frontend/react.json: 5 rules (frontend detected)
  frontend/tailwind.json: 4 rules (tailwindcss in deps)
  frontend/shadcn.json: 2 rules (components.json exists)
  fullstack/nextjs.json: 9 rules (frontend=nextjs)
  backend/supabase.json: 5 rules (backend=supabase)
  sdks/tanstack-query.json: 4 rules (@tanstack/react-query in deps)
  sdks/zod.json: 2 rules (zod in deps)
  Total: 41 plugin rules active
```

**2c. Regenerate project `frameworkValidation` from generated docs**

Scan the generated framework docs at `{generatedRefsRoot}/**/generated/*.md` for regex-blockable anti-patterns:

1. For each `*.md`, find lines starting with `- ❌` and `| Before |` migration table rows
2. For each anti-pattern that is regex-blockable (contains a concrete code pattern like an import, function call, or config value):
   - Check if it's already covered by a plugin default rule (compare regex patterns)
   - If NOT covered: generate a `frameworkValidation` rule
   - If already covered: skip (plugin defaults handle it)
3. Preserve existing project-specific rules (icons, monorepo patterns, etc.) — only add/update doc-sourced rules
4. Report:
   ```
   Project frameworkValidation:
     = Kept: nextjs (1 rule — project-specific server component check)
     = Kept: icons (1 rule — project-specific @iconify/react)
     + Added: nextjs-suspense (1 rule — from 01-nextjs-16.md anti-patterns)
     ~ Covered by plugin: hsl colors, @tailwind directives (no project rule needed)
   ```

**2d. Diff and confirm**

Show the user what changed in `no-bandaids.json` before writing:

```
Config changes:
  composureVersion: "1.5.0" → "1.6.0"
  frameworkValidation: 4 groups → 5 groups (+1 from docs)
  
Apply? [Y/n]
```

Use `AskUserQuestion` for confirmation if more than just the version stamp changed.

### Step 3: Re-detect stack (if `stack` or `all`)

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

### Step 4: Update reference docs (if `docs` or `all`)

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

### Step 5: Sync hooks (if `hooks` or `all`)

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

### Step 6: Ensure Companion Plugins

Same logic as `/composure:initialize` Step 8 — check if companion plugins are installed and initialized. This ensures `/update-project all` is a complete refresh, not just Composure.

1. Check which companions are installed (via plugin cache directory, not CLI)
2. For any installed but uninitialized companion (config file missing):
   - Sentinel: run `/sentinel:initialize` if `.claude/sentinel.json` missing
   - Testbench: run `/testbench:initialize` if `.claude/testbench.json` missing
   - Shipyard: run `/shipyard:initialize` if `.claude/shipyard.json` missing
3. For any companion NOT installed: install it from the marketplace, then initialize
4. Skip this step if only `docs`, `hooks`, or `stack` was passed (not `all`)

### Step 7: Report

Print a concise summary. Only show sections that had changes.

```
Composure updated for <project-name>

Config: composureVersion 1.5.0 → 1.6.0
  Plugin defaults: 41 rules active (shared:10, frontend:11, nextjs:9, supabase:5, sdks:6)
  Project rules: 4 groups (nextjs, icons, icons-mobile, expo)

Stack: typescript 6.0, react 19.2, next 16.2, tailwind 4.2
  = No changes

Docs: 2 updated, 1 created, 5 unchanged
  + frontend/generated/05-tanstack-query-5.95.md
  ~ frontend/generated/02-react-19.md (19.2 -> 19.3)

Hooks: no changes (using plugin hooks directly)

Companion plugins:
  = Sentinel: already initialized
  = Testbench: already initialized
  + Shipyard: initialized (was installed but not set up)
```

If nothing changed at all:
```
Everything up to date. composureVersion: 1.6.0, 41 plugin rules active, 4 project rules.
```
