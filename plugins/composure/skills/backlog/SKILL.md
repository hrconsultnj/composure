---
name: backlog
description: Review and process accumulated code quality tasks from tasks-plans/tasks.md, tasks-plans/audits/, and tasks-plans/blueprints/. Tasks are auto-logged by the PostToolUse hook, decomposition audits, and blueprints. Supports batch processing, delegation to sub-agents, verification, and archiving.
argument-hint: "[add <description>|batch|delegate|clean|summary|sync|verify|archive]"
---

# Review Code Quality Tasks

Process the task queue from `tasks-plans/tasks.md` (hook-generated), `tasks-plans/audits/` (audit-generated), and `tasks-plans/blueprints/` (blueprint-generated).

## How It Works

Tasks come from three sources:
1. **`tasks-plans/tasks.md`** — Auto-logged by the PostToolUse hook as you work (mechanical: EXTRACT, MOVE, REFACTOR)
2. **`tasks-plans/audits/*.md`** — Written by `/audit` with detailed decomposition guidance
3. **`tasks-plans/blueprints/*.md`** — Written by `/blueprint` with pre-work assessment checklists

This skill processes both, creates `TaskCreate` entries for visibility, and dispatches work.

## Steps

### Step 1: Read Task Sources

1. Read `tasks-plans/tasks.md` from the project root
2. Read any `tasks-plans/audits/*.md` and `tasks-plans/blueprints/*.md` files that have unchecked items (`- [ ]`)
3. If none exist, tell the user no tasks have been logged yet

### Step 2: Categorize and Prioritize

Group open tasks (`- [ ]`) by severity:

1. **🔴 Critical** — Files over 2x their size limit (800+ line components, 200+ line hooks)
2. **🟡 High** — Files 1.5-2x their limit, or with large functions (100+ lines)
3. **🟢 Moderate** — Files 1-1.5x limit, or shared-type duplication

### Step 3: Sync to TaskCreate (MANDATORY for `sync` and `delegate` modes)

Use the native `TaskCreate` tool for each Critical and High priority task. Include the file path, current line count, limit, and decomposition steps from `tasks-plans/` if available. Claude knows the TaskCreate schema — just call the tool directly.

### Step 4: Present Summary

Show a concise summary table:

```
## Code Quality Task Summary

| Priority | Count | Worst Offender | Source |
|----------|-------|----------------|--------|
| 🔴 Critical | 2 | `create-user-sheet/index.tsx` (834 lines) | tasks-plans/tasks.md + tasks-plans/audits/ |
| 🟡 High | 5 | `use-dispatch-stops.ts` (467 lines) | tasks-plans/tasks.md |
| 🟢 Moderate | 3 | `message-bubble.tsx` (239 lines) | tasks-plans/tasks.md |

**Total: 10 open tasks** | **TaskCreate synced: 7 (Critical + High)**
```

### Step 5: Process Based on Argument

#### `add [description]` — Queue a task manually

Persist a work item to `tasks-plans/tasks.md` so it survives across sessions. Use this to capture backlog items, follow-ups, or anything you want to defer without losing track.

1. Create `tasks-plans/` and `tasks-plans/tasks.md` if they don't exist
2. Classify the task:
   - If it references a specific file path → `TASK` prefix with the file
   - If it's a project-wide item (e.g., "update README counts") → `PROJECT` prefix
   - If it references an external action (e.g., "add composure-pro.com link") → `PROJECT` prefix
3. Append to `tasks-plans/tasks.md`:
   ```
   - [ ] [PROJECT] {description}
   ```
   or:
   ```
   - [ ] [TASK] `path/to/file.ts` — {description}
   ```
4. Report: "Queued: {description} → tasks-plans/tasks.md"

Multiple tasks can be added at once — pass them as a list:
```
/backlog add Update README skill counts; Add composure-pro.com to init report; Clean up global skills directory
```
Splits on `;` and adds each as a separate `- [ ]` entry.

#### No argument or `summary` — Show summary (Steps 2-4)

Also creates TaskCreate entries for Critical/High items so they're visible.

#### `sync` — Create TaskCreate entries from all task sources

1. Read `tasks-plans/tasks.md`, `tasks-plans/audits/*.md`, and `tasks-plans/blueprints/*.md`
2. Create TaskCreate for Critical and High items
3. Report what was synced
4. Does NOT execute any fixes

#### `batch` — Process tasks sequentially

**Requires the code graph.** Batch mode moves files and updates imports across the codebase — the graph provides exact importer data to do this safely. If the graph MCP is unavailable, run the auto-fix from `/composure:initialize` Step 0a (check Node version, find plugin path, register via `claude mcp add`). If it still can't connect, **stop** — tell the user to restart Claude Code and re-run.

1. Start with Critical tasks first
2. For each task, read the file, check `tasks-plans/audits/` for detailed guidance, apply the decomposition pattern:
   - Create feature folder
   - Extract types to `types.ts`
   - Split large components into focused children
   - Create barrel `index.ts`
   - Update imports across the codebase
3. Mark the task `[x]` in `tasks-plans/tasks.md` AND the corresponding `tasks-plans/audits/` or `tasks-plans/blueprints/` file when done
4. Update TaskCreate status to `completed`
5. Run `pnpm typecheck` after each decomposition to verify

#### `delegate` — Dispatch sub-agents in parallel

**When to use agents vs batch:**
Agents cost $0.15+ per spawn (startup overhead). Direct Read costs $0.005/file. Use this to decide:
- **<10 tasks**: use `batch` mode. Read files directly, process sequentially. 30x cheaper per file, no context duplication, no agent overhead.
- **10+ independent tasks**: use `delegate`. The value is PARALLEL WRITES (modifying independent files simultaneously), not parallel reads.
- **Rule**: agents are for parallelism on independent WRITE operations. Never spawn an agent just to read files — Read them directly.

**Prerequisites:**
- **Tasks must exist.** Delegate executes pre-analyzed work — it does not analyze. If `tasks-plans/tasks.md` has no open items (`- [ ]`) and no `tasks-plans/audits/*.md` or `tasks-plans/blueprints/*.md` files have open items, stop: "No tasks to delegate. Run `/composure:audit` or `/composure:blueprint` first."
- **The code graph is NOT required for dispatching.** The analysis was already done (by audit, which used the graph). Sub-agents receive specific instructions, not analysis queries. If the graph MCP is unavailable, register it for future sessions (run the auto-fix from `/composure:initialize` Step 0a) but **do NOT stop**. Continue dispatching.

**Dependency chain:** `/audit` (analyzes, creates tasks) → `/backlog delegate` (executes tasks) → `/backlog verify` (confirms results)

1. Create TaskCreate entries first (sync step)
2. **Query the graph** for each task's file to get imports and dependents — include these paths in the agent prompt so agents don't need to search
3. Group tasks by independence (files that don't import each other can be done in parallel)
4. Launch sub-agents for independent groups — give each agent **EXACT file paths** from the graph, not broad search prompts:
   ```
   Agent 1: Decompose create-user-sheet (Critical) — split into 5 step files + orchestrator
   Agent 2: Split keys.ts (Critical) — 10 domain files + barrel
   Agent 3: Extract 5 web route files to page clients (High)
   ```
4. Each sub-agent should:
   - Invoke the app-architecture skill first
   - Follow the decomposition pattern from the skill
   - Mark the task `[x]` in both `tasks-plans/tasks.md` and the corresponding audit/blueprint file when done
   - Update TaskCreate status to `completed`
   - Run typecheck on the affected files

5. **After all sub-agents complete and changes are merged back** (especially from worktrees):
   - If the graph MCP is available: call `build_or_update_graph({ full_rebuild: true })` — worktrees don't have the graph database (it's gitignored), so per-file hooks didn't update it during the sub-agents' work. A full rebuild re-indexes all the new/moved/split files at once.
   - If the graph MCP is NOT available: remind the user that the graph will auto-register on next restart, and suggest running `/composure:build-graph` then
   - Run `/composure:review` to verify the merged changes (if graph available)
   - This is the parent agent's responsibility, not the sub-agents'

#### `verify` — Check file sizes against audit items, mark done
1. Read all open tasks (`- [ ]`) from `tasks-plans/tasks.md`, `tasks-plans/audits/*.md`, and `tasks-plans/blueprints/*.md`
2. For each DECOMPOSE task, check the **current file size** using `wc -l`:
   - If the file is now under its limit → mark `[x]` with `✅ {date}` and current size
   - If the file was split into new files → verify the new files exist, mark `[x]`
   - If still over limit → leave `[ ]`, report remaining delta
3. For each EXTRACT task, check if the target file exists (e.g., `types.ts`, `serialization.ts`)
4. Update both `tasks-plans/tasks.md` AND matching audit/blueprint files
5. Report: verified N items, M completed, K remaining
6. If all items in an audit file are `[x]` → suggest running `/backlog archive`

**When to spawn sub-agent for verify**: Only if there are 10+ open items (each needs a file read + size check). For <10 items, run verification directly — Read each file, check size, faster than agent startup overhead.

#### `archive` — Move completed audits, reset task queue
1. Find all files in `tasks-plans/audits/*.md` and `tasks-plans/blueprints/*.md` where **every** `- [ ]` is now `- [x]`
2. Move fully-completed files to `tasks-plans/archived/` (create dir if needed)
3. Clear `tasks-plans/tasks.md`: keep lines 1-4 (header + comments + blank), remove everything after
4. Report: archived N audit files, cleared task queue

#### `clean` — Remove resolved tasks (without archiving)
1. Remove all lines with `- [x]` from `tasks-plans/tasks.md`
2. Update checked items in audit/blueprint files
3. Report how many tasks were cleaned

### Step 6: For SHARED Tasks

When processing **SHARED** tasks (types duplicated from `@etal-crm/shared`):
1. Read the shared package to find the canonical type definition
2. Replace the inline type with an import: `import { TypeName } from '@etal-crm/shared'`
3. If the type doesn't exist in shared but should, use AskUserQuestion to confirm before adding it

## Task Source Priority

When the same file appears in both `tasks-plans/tasks.md` and `tasks-plans/audits/`:
- **Use `tasks-plans/audits/` for decomposition guidance** — it has detailed steps, phase grouping, and root cause context
- **Use `tasks-plans/tasks.md` for line-level details** — it has exact line numbers for EXTRACT/MOVE operations
- **Mark both as done** when the work is complete

## Notes

- Tasks are logged by the PostToolUse hook automatically during development
- Audit files are created by `/audit` in `tasks-plans/audits/` with rich decomposition context
- Blueprint files are created by `/blueprint` in `tasks-plans/blueprints/` with pre-work assessment checklists
- All task files persist across sessions — another session can pick up where you left off
- Use `delegate` mode for maximum parallelism when you have many independent tasks
- SHARED tasks are usually quick fixes (replace inline with import)
- DECOMPOSE tasks are larger and benefit from the app-architecture skill patterns
- After processing, run `pnpm typecheck && pnpm lint` to verify nothing broke
- **Audit files live in `tasks-plans/audits/`**, blueprint files in `tasks-plans/blueprints/`

## Handoff — After Processing Tasks

Based on what was done, suggest the natural next step:

| After mode | Suggest |
|---|---|
| `batch` or `delegate` (tasks were fixed) | "`/composure:review` — review all changes before committing" |
| `verify` (all tasks verified complete) | "`/composure:backlog archive` — archive completed audits and clear queue" |
| `summary` (tasks exist but untouched) | "`batch` to process sequentially, or `delegate` to dispatch sub-agents in parallel" |
| `archive` (everything cleaned up) | "Task queue clean. Use `/composure:blueprint` to plan your next feature." |
