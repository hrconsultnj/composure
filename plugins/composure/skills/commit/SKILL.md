---
name: commit
description: Commit changes with automatic task queue hygiene. Use when the user says "commit", "commit this", "commit and push", or wants to create a git commit. Auto-cleans resolved tasks, archives completed audits, and blocks if staged files have open quality tasks.
---

# Commit with Task Queue Review

Commit changes while enforcing task queue hygiene. This skill replaces manual `/review-tasks clean` and `/review-tasks archive` by running them automatically before every commit.

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

### Step 3: Decision gate

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

### Step 4: Create the commit

Follow the standard git commit flow:

1. Run `git status` to see what's staged
2. Run `git diff --cached` to review staged changes
3. Run `git log --oneline -5` to check recent commit message style
4. Draft a concise commit message based on the changes
5. Run `git commit` with the message
6. Report success

### Step 5: Push (only if requested)

If the user said "commit and push" or similar:
1. Run `git push`
2. If push fails (e.g., no upstream), set upstream and push

Otherwise, do NOT push unless explicitly asked.

### Step 6: Update the code graph

After committing (and pushing if requested), update the graph so it stays current:

1. Check if the `build_or_update_graph` MCP tool is available (composure-graph server running)
2. If available, call `build_or_update_graph({ full_rebuild: false })` — incremental update, only processes changed files
3. Report briefly: "Graph updated: N files changed"
4. If the MCP tool isn't available, skip silently — the PostToolUse hook handles per-file updates anyway

This keeps the graph fresh without requiring users to remember `/build-graph` manually.

## Notes

- Housekeeping runs on EVERY commit, keeping the task queue tidy automatically
- The task check matches on partial paths — a task for `apps/web/src/components/foo.tsx` matches a staged file with the same relative path
- This skill replaces the need to manually run `/review-tasks clean` and `/review-tasks archive`
- Severity gate blocks on ALL severities — Critical, High, AND Moderate
