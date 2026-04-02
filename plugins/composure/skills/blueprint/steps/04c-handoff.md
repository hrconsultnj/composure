# Step 4c: Handoff

Present a brief summary of the blueprint to the user.

## If gaps surfaced during writing

Sometimes writing the Implementation Spec reveals gaps — a function signature you couldn't verify, a design question that only appears when you get specific. If this happened, present the gaps now:

"Blueprint written at `tasks-plans/blueprints/{slug}-{date}.md`.

While writing the spec, I need clarity on:
1. [Specific question that surfaced]
2. [Another question if applicable]

Review the blueprint and answer these, then tell me to start — or adjust anything first."

Use **AskUserQuestion** with the specific questions. **STOP and wait for the user's response.**

### After the user answers: UPDATE the blueprint

The blueprint on disk must reflect the final agreed-upon design. After the user answers gap questions:

1. Re-read the blueprint file
2. Update the relevant sections (Decisions, Implementation Spec, or wherever the gap was) to incorporate the user's answer
3. Write the updated blueprint back to disk

Do NOT leave the blueprint in a pre-answer state. The blueprint is the contract — it must match what was agreed.

## If no gaps (clean handoff)

"Blueprint written at `tasks-plans/blueprints/{slug}-{date}.md`. Review it, then tell me to start — or adjust anything first."

Use **AskUserQuestion** with:
- Option 1: "Start building" (Recommended)
- Option 2: "Adjust something"

The user's response is the approval gate. When they say go, proceed to task creation and execution.

## After approval: Create TaskCreate entries from checklist

When the user approves ("start building"), create native TaskCreate entries from the blueprint's Checklist section. This gives the user live visibility into what Claude is executing — they don't need to open the blueprint file.

**For each checklist item (`- [ ]`):**

1. Create a TaskCreate entry with:
   - **subject**: The checklist item text (imperative form)
   - **description**: The corresponding Implementation Spec section (file path, what changes, exact details)
   - **activeForm**: Present-tense action ("Moving layout files", "Updating imports")

2. **Set dependencies** with `addBlockedBy`:
   - If the blueprint has phases (Phase 1, Phase 2, etc.), tasks in Phase 2 are blocked by Phase 1 tasks
   - Within a phase, independent tasks have no blockers (can run in parallel)
   - Verification tasks are blocked by ALL implementation tasks

3. **Mark tasks as you work**: Set `in_progress` when starting a checklist item, `completed` when done. This gives the user real-time progress without reading the file.

**Example** for a 4-phase restructure:
```
Task 1: Create directories + move layout files       (Phase 1, no blockers)
Task 2: Create directories + move visual files        (Phase 1, no blockers)  
Task 3: Update layout import paths                    (Phase 2, blocked by 1)
Task 4: Update visual import paths                    (Phase 2, blocked by 2)
Task 5: Extract shared pricing data                   (Phase 3, blocked by 3,4)
Task 6: Typecheck + build verification                (Phase 4, blocked by all)
```

The user sees tasks appearing, progressing, and completing — a live dashboard of execution.

**Keep the blueprint file in sync**: As tasks complete, also mark the corresponding `- [ ]` → `- [x]` in the blueprint file. Both the TaskCreate system AND the file stay current.

## Integration Notes

- **Blueprint files persist across sessions** — another session can pick them up via `/backlog`
- **TaskCreate entries are session-scoped** — they give live visibility during execution but don't persist. The blueprint file is the durable record.
- **Checklist items use `- [ ]` format** — compatible with `/backlog verify` and `/commit` gate
- **The commit skill scans `tasks-plans/blueprints/*.md`** — open blueprint items are visible during commits
- **After blueprint, the architecture docs are already loaded** — no need to invoke `/app-architecture` separately

**Done.** If the Implementation Spec describes file moves or renames, suggest `/composure:code-organizer` to handle the restructuring with import updates.
