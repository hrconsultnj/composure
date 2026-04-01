---
name: commit
description: Commit changes with automatic task queue hygiene. Use when the user says "commit", "commit this", "commit and push", or wants to create a git commit. Auto-cleans resolved tasks, archives completed audits, and blocks if staged files have open quality tasks.
---

# Commit with Task Queue Review

Commit changes while enforcing task queue hygiene. Offers pre-commit verification options when companion plugins are installed.

## Steps

### Step 1: Housekeeping (auto clean + archive)

Before anything else, silently handle completed tasks:

1. Read `tasks-plans/tasks.md`. If it has any `- [x]` entries:
   - Remove all `- [x]` lines and any indented sub-lines beneath them
   - Update the "Last cleaned" date comment

2. Check `tasks-plans/audits/*.md` and `tasks-plans/blueprints/*.md` files. For any file where ALL items are `- [x]` (none are `- [ ]`):
   - Create `tasks-plans/archived/` if it doesn't exist
   - Move the fully-completed file to `tasks-plans/archived/`

3. If nothing was cleaned, skip silently. If items were cleaned, note it briefly (e.g., "Cleaned 3 resolved tasks").

### Step 2: Check staged files against open tasks

1. Run `git diff --cached --name-only` to get staged files
2. If nothing is staged, run `git status` and ask what to stage
3. Read `tasks-plans/tasks.md` for remaining open items (`- [ ]`)
4. For each open task, check if the task's file path matches any staged file (partial path matching)

### Step 3: Task gate

**If open tasks exist on staged files** — show blockers and stop:

```
Open tasks found on staged files:

🔴 Critical:
- `path/to/file.tsx` (1220 lines) — DECOMPOSE: extract SecurityClient

🟡 High:
- `path/to/other.tsx` (739 lines) — DECOMPOSE: split into focused components

Resolve these tasks first, or unstage the files with:
git reset HEAD <file>
```

**If no open tasks on staged files** — proceed to Step 4.

**If `tasks-plans/tasks.md` doesn't exist or has no open items** — proceed to Step 4.

### Step 4: Commit mode

Use **AskUserQuestion** to let the user choose their commit mode. Detect which companion plugins are installed to build the options dynamically.

**Detection**: Check which plugins are available:
- **Sentinel**: `ls "${CLAUDE_PLUGIN_ROOT}/../sentinel" 2>/dev/null` or check if `/sentinel:scan` is in the skill list
- **Testbench**: check for `/testbench:run`
- **Shipyard**: check for `/shipyard:ci-validate`

**Always offer these options:**

| Option | What it does |
|---|---|
| **Commit** (Recommended) | Task check passed → commit immediately. Fast, no extra checks. |
| **Commit with checks** | Run typecheck + lint on staged files, then commit if clean. |

**Add these options ONLY if the companion plugin is installed:**

| Option | Requires | What it does |
|---|---|---|
| **Commit with security scan** | Sentinel | Run `/sentinel:scan` on staged files before committing. Blocks on critical/high findings. |
| **Commit with tests** | Testbench | Run `/testbench:run --changed` for staged files before committing. Blocks on failures. |
| **Full verification commit** | Sentinel + Testbench | Typecheck + lint + security scan + tests. Everything passes → commit. |

**If user says "just commit" or the argument includes `--quick`**: Skip the question, go directly to Step 5 (commit immediately after task check).

### Step 5: Run selected checks (if any)

Based on the user's choice in Step 4:

**Typecheck + lint:**
1. Detect the project's typecheck command from `package.json` scripts or `.claude/no-bandaids.json`
2. Run it (e.g., `npx tsc --noEmit`, `pyright`, `go vet`)
3. Run lint if configured (e.g., `npx eslint --no-warn-ignored`, `ruff check`, `golangci-lint run`)
4. If errors: show them and ask "Fix these or commit anyway?"

**Security scan (Sentinel):**
1. Run focused scan on staged files only — not the whole project
2. Critical/high findings → block with details
3. Moderate/low → warn but allow commit

**Tests (Testbench):**
1. Run tests for changed files only — not the full suite
2. Failures → block with failure details
3. All pass → proceed

**If any check blocks**: Show the findings and stop. Do NOT commit. The user fixes and re-runs `/commit`.

### Step 6: Create the commit

Follow the standard git commit flow:

1. Run `git status` to see what's staged
2. Run `git diff --cached` to review staged changes
3. Run `git log --oneline -5` to check recent commit message style
4. Draft a concise commit message based on the changes
5. Run `git commit` with the message
6. Report success

### Step 7: Push (only if requested)

If the user said "commit and push" or similar:
1. Run `git push`
2. If push fails (e.g., no upstream), set upstream and push

Otherwise, do NOT push unless explicitly asked.

### Step 8: Update the code graph

After committing (and pushing if requested), update the graph so it stays current:

1. Check if the `build_or_update_graph` MCP tool is available
2. If available, call `build_or_update_graph({ full_rebuild: false })` — incremental update
3. Report briefly: "Graph updated: N files changed"
4. If unavailable, skip silently

## Arguments

- `--quick` — Skip the commit mode question, commit immediately after task check
- `--push` — Commit and push in one step

## Notes

- Housekeeping runs on EVERY commit, keeping the task queue tidy automatically
- The task check matches on partial paths — a task for `apps/web/src/components/foo.tsx` matches a staged file with the same relative path
- Severity gate blocks on ALL severities — Critical, High, AND Moderate
- Companion plugin checks are additive — they only appear when the plugin is installed
- `--quick` is for when you just need to save work without ceremony
