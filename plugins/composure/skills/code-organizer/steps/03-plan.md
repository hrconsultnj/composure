# Step 3: Generate Reorganization Plan

Compile all findings into a structured plan. Present it to the user:

```markdown
## Reorganization Plan — {project-name}

### Stack: {framework} | Naming: {convention}

### New directories to create
- {dir}/

### File moves (ordered by dependency — leaves first)
| # | Source | Destination | Reason | Risk (importers) |
|---|--------|-------------|--------|-------------------|
| 1 | {path} | {new-path} | {classification} outside {expected-dir} | {N} files |

### Renames (naming normalization)
| # | Current | Renamed | Convention |
|---|---------|---------|-----------|
| 1 | {name} | {new-name} | {convention} |

### Barrel exports to create
- {dir}/index.ts (re-exports: {list})

### Root clutter
| # | File | Size | Issue | Action |
|---|------|------|-------|--------|
| 1 | `Logo.png` | 1.2MB | Loose asset at root | Move to `public/` |
| 2 | `tsconfig.tsbuildinfo` | 48KB | Build artifact, not gitignored | Add to `.gitignore` |

### Warnings
- {any dynamic imports, alias edge cases, or files that need manual review}

### Summary
- {N} files to move
- {M} files to rename
- {K} new directories
- ~{P} files need import path updates
- {Q} root clutter items (assets to move, artifacts to gitignore)
```

## Auto-Blueprint for Large Restructures

If the plan is complex enough to need a persistent plan, automatically generate a blueprint BEFORE executing.

**Threshold** — based on operations AND blast radius:
- **<10 file operations, no high-importer files**: present the plan directly and execute (current behavior).
- **10-15 operations OR any file with 10+ importers being moved**: offer to blueprint. "This restructure affects N files with M import updates. Want me to blueprint it first?"
- **15+ operations**: auto-blueprint. Write to `tasks-plans/blueprints/file-reorg-{date}.md` with Implementation Spec, Preservation Boundaries, Verification phases, and per-file checklist. The blueprint persists across sessions — if execution is interrupted, another session picks it up.

When blueprinting:
1. Write the plan using the blueprint template (`templates/04b-blueprint-document.md`)
2. Include phases (create dirs → move files → update imports → verify)
3. Include the import mapping table (old path → new path → importers to update)
4. Present the blueprint for approval, then proceed to Step 4

**STOP HERE.** Present the plan (or blueprint) and wait for user approval.

The user can respond:
- **"go"** — Execute the full plan
- **"go except #3, #7"** — Execute all except specified rows
- **"stop"** — Abort, no changes made

If `--dry-run` was specified, end the skill entirely after presenting the plan.

---

**Next:** Read `steps/04-execute.md`
