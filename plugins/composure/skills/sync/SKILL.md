---
name: sync
description: Bring your Composure workspace fully current — credentials, plugin version, project config, hooks, references. Plus `pull` subcommand for cross-machine bootstrap. For pricing tier changes use /composure:account upgrade.
argument-hint: "[pull] [--dry-run] [--verbose]"
---

Two modes:
- **Local sync** (no subcommand): Run all 8 steps in order. Each step either AUTO-FIXES idempotently OR prints the exact thing for the user to do.
- **`pull` subcommand**: Cross-machine bootstrap — OAuth login → fetch user's plugin manifest from SaaS → auto-run marketplace add + plugin install → optionally restore Cortex graph backup.

`/composure:sync` is the action ("fix what's wrong"). For diagnostic-only output without changes, use `/composure:health` or `/composure:sync --dry-run` (equivalent).

Workspace currency only — pricing tier changes go through `/composure:account upgrade`.

## Progress Tracking

This skill uses TaskCreate for progress tracking. Before starting work:
1. Create one task per major step using TaskCreate
2. Set each task to `in_progress` when starting it (TaskUpdate)
3. Mark `completed` when done
4. Write deliverables to files, not inline — inline text is for communication only

## Content Loading

**Preferred (MCP tool):**

Invoke the `composure_fetch_skill` MCP tool with:
- `plugin`: `"composure"`
- `skill`: `"update"`
- `step`: the step filename without the `.md` extension (e.g., `"01-auth-check"`)


**Fallback (Bash CLI — for sandbox environments where MCP servers are not available):**

```bash
<home>/.composure/bin/composure-fetch.mjs skill composure update {step-filename}
```

Replace `<home>` with the user's **resolved absolute home directory** (e.g., `/Users/username` on macOS, `/home/username` on Linux). Do NOT use `$HOME`, `~`, or quotes — Claude Code permissions require the literal path.

**Do NOT read cache files directly** — they are encrypted at rest. Always use one of the methods above.

## Steps

| # | File | Purpose |
|---|------|---------|
| 01 | `01-auth-check.md` | Verify ~/.composure/credentials.json + token validity; auto-prompt login if missing |
| 02 | `02-plugin-version.md` | Compare installed plugin SHA vs marketplace HEAD; refresh `~/.composure/manifest.json`; emit reload-prompt block if outdated |
| 03 | `03-config-migration.md` | Move legacy `.claude/no-bandaids.json` → `.composure/no-bandaids.json` (idempotent) |
| 04 | `04-framework-detect.md` | Re-run stack detection if `.composure/no-bandaids.json` missing OR project package.json mtime > config mtime |
| 05 | `05-hook-integrity.md` | Walk `.hooks-integrity.json`; verify SHA-256 matches; surface mismatches |
| 06 | `06-stale-references.md` | Scan `.claude/settings.local.json` for hook commands referencing renamed/removed files |
| 07 | `07-cortex-sqlite.md` | Verify `~/.composure/sessions/index.db` exists + has rows; trigger reindex if missing/empty |
| 08 | `08-summary.md` | Render summary table (Step \| Status \| Action). On `--dry-run`, no actions taken — only proposed fixes listed. |
| 09 | `09-pull.md` | **Only when invoked as `/composure:sync pull`**: cross-machine bootstrap (SaaS manifest fetch → install plan). Runs INSTEAD of steps 01–08, not in addition. |

For local sync (`/composure:sync` with no subcommand): execute steps 01–08 in order. Do NOT skip.

For cross-machine bootstrap (`/composure:sync pull`): execute ONLY step 09. The binary `~/.composure/bin/composure-sync-pull.mjs` handles the orchestration.

## Single-binary alternative

The same 8-step orchestration is available as a standalone CLI binary:

```bash
<home>/.composure/bin/composure-update.mjs [--dry-run] [--verbose]
```

This is what the SessionStart `auto-fix.sh` hook calls when it auto-invokes the update flow. Users can call it directly from any shell.

## Auto-fix vs surface-only matrix

| Drift item | Auto-fix? | Surface only |
|---|---|---|
| Auth missing/expired | yes (auto-runs `composure-auth login`/`refresh`) | — |
| Plugin SHA out of date | — | yes (must run `/plugin install composure@composure-suite` in Claude Code's `/plugin` UI) |
| Legacy `.claude/no-bandaids.json` config | yes (file move) | — |
| `.composure/no-bandaids.json` missing | yes (auto-invoke `/composure:initialize`) | — |
| Hook integrity mismatch | — | yes (suggest plugin reinstall) |
| Stale settings.local.json hook ref | — | yes (user-owned config; suggest exact line edit) |
| Cortex sqlite missing/empty | yes (auto-run `node ~/.composure/sessions/cli/reindex-all.mjs`) | — |
