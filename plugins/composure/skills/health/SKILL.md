---
name: health
description: Comprehensive health check — reports plugin version, auth, hook integrity, project initialization, graph freshness, companion plugins, and open tasks in a single diagnostic view.
argument-hint: "[--json]"
---

Run a full diagnostic of the Composure installation and project setup. This skill is self-contained — no API calls needed.

## Instructions

Gather all diagnostic data below, then present it in the formatted output. Do NOT skip checks — run all of them even if earlier ones fail.

### 1. Plugin Version

Read `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` and extract the `version` field.

- If readable: `composure@{version}` with checkmark
- If not found: report as "unknown (plugin.json not found)"

### 2. Authentication Status

Run the token validator:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/composure-token.mjs" validate 2>/dev/null
```

- Exit 0: Parse output as `plan:email` format. Report plan + email with checkmark.
- Exit 2: Token expired. Report "expired — run /composure:auth login"
- File missing (`~/.composure/credentials.json`): Report "not authenticated"

### 3. Hook Integrity

Read `${CLAUDE_PLUGIN_ROOT}/hooks/.hooks-integrity.json`. For each hook file listed:

1. Find it under hooks/ subdirectories
2. Compute SHA-256: `shasum -a 256 {path}` (macOS) or `sha256sum {path}` (Linux)
3. Compare against expected hash

Report: `{verified}/{total} hooks verified` with checkmark, or list any mismatched/missing files.

### 4. Project Initialization

Check for `.composure/no-bandaids.json` first, then `.claude/no-bandaids.json` (backward compat).

- If either exists: Report "initialized" with checkmark, note which path, and extract `composureVersion`
- If neither exists: Report "not initialized — run /composure:initialize"

### 5. Stack Detection

If the config exists (either `.composure/` or `.claude/`), extract:
- `frameworks.{lang}.frontend` (e.g., "nextjs")
- `frameworks.{lang}.backend` (e.g., "supabase")
- Language keys from `frameworks` object

Format: `{Frontend} + {Backend} ({languages})`

### 6. Code Graph

Check for `.code-review-graph/graph.db`:

- If exists: Report file modification time relative to now (e.g., "fresh (updated 5m ago)")
- Compare against last git commit time — if commit is newer, report "stale"
- If missing: Report "not built — run /composure:build-graph"

### 7. Companion Plugins

Check each companion's project config file:

| Plugin | Config file | Plugin dir pattern |
|--------|------------|-------------------|
| sentinel | `.composure/sentinel.json` or `.claude/sentinel.json` | `${CLAUDE_PLUGIN_ROOT%/*}/sentinel/` |
| shipyard | `.composure/shipyard.json` or `.claude/shipyard.json` | `${CLAUDE_PLUGIN_ROOT%/*}/shipyard/` |
| testbench | `.composure/testbench.json` or `.claude/testbench.json` | `${CLAUDE_PLUGIN_ROOT%/*}/testbench/` |
| design-forge | n/a (no project config) | `${CLAUDE_PLUGIN_ROOT%/*}/design-forge/` |

For each:
- Plugin installed + config exists: checkmark
- Plugin installed + config missing: "installed, not initialized"
- Plugin not installed: "not installed"

### 8. Open Tasks

Read `tasks-plans/tasks.md` if it exists:
- Count lines matching `^- \[ \]` (open)
- Count lines matching `^- \[x\]` (completed)

Report: `{open} open, {completed} completed`

## Output Format

Present results in this exact format:

```
Composure Status
────────────────────────────────────────
Plugin:         {version} {status}
Auth:           {auth status} {status}
Hook integrity: {count} {status}
Project:        {init status} {status}
Stack:          {stack info}
Graph:          {graph status} {status}
Companions:     {companion list}
Tasks:          {task counts}
────────────────────────────────────────
```

Use checkmark for passing, cross for failing, dash for not applicable.

If `--json` argument is provided, output the results as a JSON object instead of the formatted table.

## After Status

If any checks failed, suggest the specific fix command:
- Auth failed: `/composure:auth login`
- Not initialized: `/composure:initialize`
- Graph stale/missing: `/composure:build-graph`
- Companions not initialized: `/composure:initialize` (handles all)
- Hooks tampered: `claude plugin update composure`
