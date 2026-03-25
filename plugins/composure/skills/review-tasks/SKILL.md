---
name: review-tasks
description: Review and process accumulated code quality tasks from tasks-plans/tasks.md and tasks-plans/. Tasks are auto-logged by the PostToolUse hook and decomposition audits. Supports batch processing, delegation to sub-agents, verification, and archiving.
argument-hint: "[batch|delegate|clean|summary|sync|verify|archive]"
---

# Review Code Quality Tasks

Process the task queue from `tasks-plans/tasks.md` (hook-generated) and `tasks-plans/` (audit-generated).

## How It Works

Tasks come from two sources:
1. **`tasks-plans/tasks.md`** — Auto-logged by the PostToolUse hook as you work (mechanical: EXTRACT, MOVE, REFACTOR)
2. **`tasks-plans/*.md`** — Written by `/decomposition-audit` with detailed decomposition guidance

This skill processes both, creates `TaskCreate` entries for visibility, and dispatches work.

## Steps

### Step 1: Read Task Sources

1. Read `tasks-plans/tasks.md` from the project root
2. Read any `tasks-plans/*.md` files that have unchecked items (`- [ ]`)
3. If neither exists, tell the user no tasks have been logged yet

### Step 2: Categorize and Prioritize

Group open tasks (`- [ ]`) by severity:

1. **🔴 Critical** — Files over 2x their size limit (800+ line components, 200+ line hooks)
2. **🟡 High** — Files 1.5-2x their limit, or with large functions (100+ lines)
3. **🟢 Moderate** — Files 1-1.5x limit, or shared-type duplication

### Step 3: Sync to TaskCreate (MANDATORY for `sync` and `delegate` modes)

For Critical and High priority tasks, create `TaskCreate` entries so they're visible in the session:

```
TaskCreate({
  subject: "Decompose {filename} ({lines}→{limit} lines)",
  description: "File: {path}\nCurrent: {lines} lines\nLimit: {limit}\n\nSteps:\n{decomposition_steps_from_plan}",
  activeForm: "Decomposing {filename}",
  metadata: { priority: "critical"|"high", source: "tasks-plans/tasks.md"|"tasks-plans/audit.md" }
})
```

**Key**: Pull decomposition details from the `tasks-plans/` file if available — it has richer context than `tasks-plans/tasks.md` entries.

### Step 4: Present Summary

Show a concise summary table:

```
## Code Quality Task Summary

| Priority | Count | Worst Offender | Source |
|----------|-------|----------------|--------|
| 🔴 Critical | 2 | `create-user-sheet/index.tsx` (834 lines) | tasks-plans/tasks.md + tasks-plans/ |
| 🟡 High | 5 | `use-dispatch-stops.ts` (467 lines) | tasks-plans/tasks.md |
| 🟢 Moderate | 3 | `message-bubble.tsx` (239 lines) | tasks-plans/tasks.md |

**Total: 10 open tasks** | **TaskCreate synced: 7 (Critical + High)**
```

### Step 5: Process Based on Argument

#### No argument or `summary` — Show summary (Steps 2-4)

Also creates TaskCreate entries for Critical/High items so they're visible.

#### `sync` — Create TaskCreate entries from all task sources

1. Read both `tasks-plans/tasks.md` and `tasks-plans/*.md`
2. Create TaskCreate for Critical and High items
3. Report what was synced
4. Does NOT execute any fixes

#### `batch` — Process tasks sequentially

**The graph is helpful but not required.** If available, use `query_graph({ pattern: "importers_of" })` for import updates. If not, use Grep as fallback — the tasks are pre-analyzed, so you know what to do. Do NOT stop if the graph is unavailable.

1. Start with Critical tasks first
2. For each task, read the file, check `tasks-plans/` for detailed guidance, apply the decomposition pattern:
   - Create feature folder
   - Extract types to `types.ts`
   - Split large components into focused children
   - Create barrel `index.ts`
   - Update imports across the codebase
3. Mark the task `[x]` in `tasks-plans/tasks.md` AND `tasks-plans/` when done
4. Update TaskCreate status to `completed`
5. Run `pnpm typecheck` after each decomposition to verify

#### `delegate` — Dispatch sub-agents in parallel

**This mode does NOT require the code graph.** The analysis was already done (by decomposition-audit or batch mode, which used the graph). Delegate mode executes pre-analyzed tasks — the sub-agents receive specific instructions, not analysis queries. If the graph MCP is unavailable, register it for future sessions (run the auto-fix from `/composure:initialize` Step 0a) but **do NOT stop**. Continue dispatching sub-agents.

1. Create TaskCreate entries first (sync step)
2. Group tasks by independence (files that don't import each other can be done in parallel)
3. Launch sub-agents for independent groups — **include decomposition details from `tasks-plans/` in the agent prompt**:
   ```
   Agent 1: Decompose create-user-sheet (Critical) — split into 5 step files + orchestrator
   Agent 2: Split keys.ts (Critical) — 10 domain files + barrel
   Agent 3: Extract 5 web route files to page clients (High)
   ```
4. Each sub-agent should:
   - Invoke the app-architecture skill first
   - Follow the decomposition pattern from the skill
   - Mark the task `[x]` in both `tasks-plans/tasks.md` and `tasks-plans/` when done
   - Update TaskCreate status to `completed`
   - Run typecheck on the affected files

5. **After all sub-agents complete and changes are merged back** (especially from worktrees):
   - If the graph MCP is available: call `build_or_update_graph({ full_rebuild: true })` — worktrees don't have the graph database (it's gitignored), so per-file hooks didn't update it during the sub-agents' work. A full rebuild re-indexes all the new/moved/split files at once.
   - If the graph MCP is NOT available: remind the user that the graph will auto-register on next restart, and suggest running `/composure:build-graph` then
   - Run `/composure:review-delta` to verify the merged changes (if graph available)
   - This is the parent agent's responsibility, not the sub-agents'

#### `verify` — Check file sizes against audit items, mark done
1. Read all open tasks (`- [ ]`) from `tasks-plans/tasks.md` and `tasks-plans/*.md`
2. For each DECOMPOSE task, check the **current file size** using `wc -l`:
   - If the file is now under its limit → mark `[x]` with `✅ {date}` and current size
   - If the file was split into new files → verify the new files exist, mark `[x]`
   - If still over limit → leave `[ ]`, report remaining delta
3. For each EXTRACT task, check if the target file exists (e.g., `types.ts`, `serialization.ts`)
4. Update both `tasks-plans/tasks.md` AND matching `tasks-plans/*.md` audit files
5. Report: verified N items, M completed, K remaining
6. If all items in an audit file are `[x]` → suggest running `/review-tasks archive`

**Spawn as sub-agent**: This mode should use an Agent (subagent_type: "general-purpose") to run the verification in parallel if there are 5+ open items. The agent reads each file, checks sizes, and returns a verification report.

#### `archive` — Move completed audits, reset task queue
1. Find all `tasks-plans/*.md` files (excluding `tasks.md`) where **every** `- [ ]` is now `- [x]`
2. Move fully-completed audit files to `tasks-plans/archived/` (create dir if needed)
3. Clear `tasks-plans/tasks.md`: keep lines 1-4 (header + comments + blank), remove everything after
4. Report: archived N audit files, cleared task queue

#### `clean` — Remove resolved tasks (without archiving)
1. Remove all lines with `- [x]` from `tasks-plans/tasks.md`
2. Update checked items in `tasks-plans/` files
3. Report how many tasks were cleaned

### Step 6: For SHARED Tasks

When processing **SHARED** tasks (types duplicated from `@etal-crm/shared`):
1. Read the shared package to find the canonical type definition
2. Replace the inline type with an import: `import { TypeName } from '@etal-crm/shared'`
3. If the type doesn't exist in shared but should, offer to add it to shared first

## Task Source Priority

When the same file appears in both `tasks-plans/tasks.md` and `tasks-plans/`:
- **Use `tasks-plans/` for decomposition guidance** — it has detailed steps, phase grouping, and root cause context
- **Use `tasks-plans/tasks.md` for line-level details** — it has exact line numbers for EXTRACT/MOVE operations
- **Mark both as done** when the work is complete

## Notes

- Tasks are logged by the PostToolUse hook automatically during development
- Plan files are created by `/decomposition-audit` with rich decomposition context
- The task file and plan files persist across sessions — another session can pick up where you left off
- Use `delegate` mode for maximum parallelism when you have many independent tasks
- SHARED tasks are usually quick fixes (replace inline with import)
- DECOMPOSE tasks are larger and benefit from the app-architecture skill patterns
- After processing, run `pnpm typecheck && pnpm lint` to verify nothing broke
- **Plan files live in `tasks-plans/`** at the project root
