---
name: code-organizer
description: Restructure a messy project into conventional file layout based on detected framework. Analyzes, plans, executes with import updates, and verifies.
argument-hint: "[--dry-run] [--aggressive] [--naming kebab|camel|pascal] [--preserve path,path] [--no-graph]"
---

# Code Organizer

Restructure a disorganized project into a clean, conventional file layout. Detects what each file is (component, hook, type, service, utility), maps it to the right directory for the detected framework, and executes the moves with import path updates.

## Arguments

- `--dry-run` — Show reorganization plan only, don't execute
- `--aggressive` — Also split large files (>300 lines) and extract shared utilities using decomposition patterns from `app-architecture/frontend/typescript/01-component-decomposition.md`
- `--naming kebab|camel|pascal` — Enforce file naming convention (default: detect dominant convention in project)
- `--preserve path,path` — Comma-separated paths to skip entirely (user's intentional structure)
- `--no-graph` — Use grep-based import scanning instead of the graph. **Only valid with `--dry-run`** — actual file moves always require the graph

## Workflow

### Step 0: Gate — Read Config & Ensure Graph

#### 0a. Stack config

1. Read `.claude/no-bandaids.json` from the project root
2. Extract: `frameworks`, `frontend`, `backend`, `monorepo`, `packageManager`
3. If the file is missing, **run `/composure:initialize` automatically** — do NOT stop and ask the user. Report: "No stack config found — running initialize first." After initialize completes, re-read the config and continue.
4. If `monorepo: true` with multiple app paths, ask the user which app to organize. Accept `--all` to process each app root independently. Never reorganize across app boundaries.

#### 0b. Ensure code graph exists (safety prerequisite)

The code graph provides **exact import dependency data** — which files import which. Without it, import path updates during file moves rely on grep, which can miss barrel re-exports, dynamic imports, and aliased paths. For a mass restructure, this is the difference between clean moves and broken imports.

**The `composure-graph` MCP server is bundled with the Composure plugin.** It is NOT an npm package — do NOT try to `npm install` it. It is declared in the plugin's `plugin.json` and should be auto-registered when the plugin is installed. If tools are unavailable, the server failed to start or the plugin wasn't installed correctly.

1. Check if `composure-graph` MCP tools are available by calling `list_graph_stats`
2. **If tools available + graph exists** (`last_updated` is not null): proceed. Report: "Graph ready: {N} files indexed"
3. **If tools available + no graph** (`last_updated` is null): build it now.
   - Call `build_or_update_graph({ full_rebuild: true })`
   - Report: "Built code graph: {N} files, {M} nodes, {K} edges — import dependencies now tracked"
   - This is non-optional. The graph must exist before we move files.
4. **If tools unavailable** (MCP server not running):
   - **Do NOT offer choices.** Do NOT ask "would you like to proceed without the graph." Do NOT try to `npm install` anything — the server is bundled with the plugin.
   - Run the auto-fix from `/composure:initialize` Step 0a:
     - **A.** Check `node --version` — must be >= 22.5.0
     - **B.** Find plugin path via `claude plugin list --json`, locate `graph/dist/server.js`, and register it: `claude mcp add composure-graph -- node --experimental-sqlite "$COMPOSURE_PATH/graph/dist/server.js"`
     - **C.** If plugin not installed at all → tell user to install it
   - After registering, tell user to restart Claude Code (Ctrl+C then `claude`).
   - **Stop here.** The graph is required. The `--no-graph` flag exists only for analysis (`--dry-run`) — never for actual file moves.

### Step 1: Load Conventions

Read `conventions.md` from this skill's directory (co-located alongside this SKILL.md).

Extract **only** the section matching the detected stack:
- `frontend: "nextjs"` → load the Next.js section
- `frontend: "vite"` → load the Vite SPA section
- `frontend: "expo"` → load the Expo section
- `frontend: "angular"` → load the Angular section
- Python detected → load the Python FastAPI section
- Go detected → load the Go section
- `monorepo: true` → also load the Monorepo section for top-level structure

This keeps token cost low — one framework's conventions, not all of them.

### Step 2: Analyze Current Structure

Run all six checks. This is the diagnostic — no files are moved yet.

#### 2a. Directory Inventory

Build a map of `directory → [source files]`:

```bash
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.go" -o -name "*.rs" \) \
  | grep -v node_modules | grep -v .next | grep -v dist | grep -v __pycache__ | grep -v vendor | grep -v target | grep -v .git \
  | sort
```

If **zero source files** are found, stop: "No source files found in this project. Nothing to reorganize." Do not proceed to Step 3.

Count files per directory. Flag directories with 15+ flat files as "overcrowded."

#### 2b. Misplaced Files

Compare each source file's location against the convention's classification rules. A file is "misplaced" if:

- It's a **component** (exports JSX) but lives outside `components/`
- It's a **hook** (filename starts with `use` or exports `function use*`) but lives outside `hooks/`
- It's a **pure type file** (only exports `type`/`interface`, no runtime code) but lives outside `types/`
- It's a **service** (contains `fetch`, `axios`, `supabase`, or API client calls, no JSX) but lives outside `services/`
- It's a **utility** (exports functions, no JSX, no hooks, no API calls) but lives outside `lib/` or `utils/`
- It's at the **project root** when it should be under `src/` or `app/`

**Classification heuristics** (use Grep on each file):

| Pattern | Classification |
|---------|---------------|
| File exports JSX (`return <` or `=> <`) | Component |
| Filename matches `use*.ts` or exports `function use[A-Z]` | Hook |
| Only `export type` / `export interface` declarations, no `function`/`const` with runtime value | Pure types |
| Contains `fetch(`, `axios.`, `supabase.`, `.from(` with no JSX | Service |
| Exports functions/constants, no JSX, no `use*` pattern, no fetch | Utility |
| Has `'use server'` directive | Server action |
| Is a route file (`page.tsx`, `layout.tsx`, `+page.svelte`) | Route (don't move) |

#### 2c. Mixed Concerns

For directories with 5+ files, check if they mix too many types. A directory has "mixed concerns" if it contains 3+ of these categories: components, hooks, types, services, utilities.

Exception: **feature folders** (see 2f) are intentionally mixed — don't flag them.

#### 2d. Missing Directories

Compare the project's current directories against the convention's target structure. List conventional directories that don't exist yet and would be needed based on the files found in 2b.

Only suggest directories that would actually receive files. Don't suggest empty `services/` if no service files were detected.

#### 2e. Naming Inconsistencies

Classify each source filename:

| Convention | Pattern | Example |
|-----------|---------|---------|
| PascalCase | Starts with uppercase, no separators | `UserCard.tsx` |
| camelCase | Starts with lowercase, no separators | `userCard.tsx` |
| kebab-case | Lowercase with hyphens | `user-card.tsx` |
| snake_case | Lowercase with underscores | `user_card.tsx` |

Determine the **dominant convention** (most files). Report outliers. If `--naming` was specified, the target convention overrides detection.

**Framework defaults** (if no dominant convention and no `--naming` flag):
- Next.js / Vite / Expo: kebab-case for files, PascalCase for component exports
- Angular: kebab-case with type suffix (`user-card.component.ts`)
- Python: snake_case
- Go: snake_case

#### 2f. Feature Folder Detection

A directory is a **feature folder** (intentional colocation) if it contains:
- At least 1 component file AND
- At least 1 of: hook, type file, service, or test file

Feature folders are **valid structure** — do NOT reorganize their contents. Instead, move the entire folder to the correct parent if needed (e.g., from `src/UserProfile/` to `components/features/user-profile/`).

#### 2g. Import Dependency Analysis

The graph was ensured in Step 0b. Use it as the **primary** source of import data.

1. For each file identified in 2b as misplaced:
   - Call `query_graph({ pattern: "importers_of", target: <file> })` to get the exact list of files that import it
   - Record the importer count as the file's **risk score** (more importers = more paths to update = higher risk)
2. For files with 10+ importers, also call `query_graph({ pattern: "imports_of", target: <file> })` to understand what the file itself depends on — these are high-traffic nodes that need extra care
3. Use importer data to determine **move order**: leaves first (0-1 importers), roots last (5+ importers). This ensures files are already in their new location before their importers get updated.

**If `--no-graph` was passed** (grep fallback):
- Skip this step entirely. Import scanning will happen during execution (Step 4) using grep.
- The plan will show "?" in the Risk column and include a warning: "Import counts unavailable — moves may require manual import fixes."

### Step 3: Generate Reorganization Plan

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

### Warnings
- {any dynamic imports, alias edge cases, or files that need manual review}

### Summary
- {N} files to move
- {M} files to rename
- {K} new directories
- ~{P} files need import path updates
```

**STOP HERE.** Present the plan and wait for user approval.

The user can respond:
- **"go"** — Execute the full plan
- **"go except #3, #7"** — Execute all except specified rows
- **"stop"** — Abort, no changes made

If `--dry-run` was specified, end the skill entirely after presenting the plan.

### Step 4: Execute Moves

For each approved move, in the dependency order from the plan:

#### 4a. Move the file

```bash
git mv "{source}" "{destination}"
```

If the destination directory doesn't exist, create it first: `mkdir -p "{dest-dir}"`

Use `git mv` to preserve git history. If the project isn't a git repo, use regular `mv`.

#### 4b. Update the moved file's imports

The file's own relative imports may have changed because its location changed. For each `import ... from './...'` or `import ... from '../...'` in the moved file:

1. Resolve what the old import pointed to (relative to old location)
2. Compute the new relative path from the file's new location to that same target
3. Rewrite the import path

#### 4c. Update all importers

Find every file that imports the moved file and rewrite their import path.

**Primary (graph available)**: Use the importer list already collected in Step 2g. For each importer:
1. Compute the new relative path from the importer to the moved file's new location
2. Rewrite the import statement
3. **Cross-check**: After rewriting, grep for any remaining references to the old path as a safety net

**Fallback (`--no-graph`)**: Grep-based scanning:
```bash
# Search for imports of the old path (without extension)
grep -rn "from ['\"].*{old-path-stem}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"
```
Then also check for:
- `require('...')` calls (CommonJS)
- Dynamic `import('...')` calls
- Barrel `export ... from '...'` re-exports

For each importer found:
1. Compute the new relative path from the importer to the moved file's new location
2. Rewrite the import statement

#### 4d. Handle barrel exports

If the moved file was re-exported from an `index.ts`:
- Update the re-export path in the old `index.ts`
- Or remove it if the file moved to a new directory that has its own barrel

If creating new barrel exports (from Step 3 plan):
- Create `index.ts` files that re-export the directory's public API

#### 4e. Handle path aliases

Read `tsconfig.json` `compilerOptions.paths` (or `jsconfig.json`).

Common aliases: `@/*` → `./src/*`, `~/` → `./`, `#/` → `./*`

**Rule**: If an import uses an alias (`import { X } from '@/lib/utils'`) and that alias still resolves correctly after the move, **do NOT rewrite it**. Only rewrite alias imports that would break.

#### 4f. Apply renames

If `--naming` was specified or naming normalization is in the plan:
- Rename files as part of the `git mv` (source → new-name at destination)
- Update all import paths to use the new filename

#### 4g. Aggressive mode (if `--aggressive`)

After all moves are complete:

1. **Split large files**: For any file over 300 lines, apply the decomposition pattern from `app-architecture/frontend/typescript/01-component-decomposition.md`:
   - Extract into a feature folder: `feature/index.ts`, `feature/FeatureContainer.tsx`, `feature/FeatureList.tsx`, etc.
   - Follow container vs. presentation split

2. **Extract shared utilities**: Find functions imported by 3+ files. If they live in a component file, extract to `lib/`:
   ```bash
   grep -rn "import.*{funcName}" --include="*.ts" --include="*.tsx" | wc -l
   ```

3. **Extract shared types**: Find types/interfaces imported by 3+ files. If they live in a component file, extract to `types/`.

### Step 5: Verify

1. **Typecheck**: Detect the typecheck command from `package.json` scripts. Look for: `typecheck`, `type-check`, `check-types`, `tsc`. For Python: `mypy`. For Go: `go vet`. Run it.

2. **Lint**: If a lint script exists in `package.json`, run it. Common names: `lint`, `eslint`.

3. **Handle failures**:
   - If typecheck fails, the errors are almost certainly broken import paths
   - Show the errors and attempt to fix remaining import paths
   - Re-run typecheck after fixes
   - If still failing after 2 attempts, list remaining errors and stop for manual review

4. **Rebuild graph**: Call `build_or_update_graph({ full_rebuild: true })` since file paths changed. This keeps the graph accurate for subsequent `/review-pr`, `/review-delta`, and PostToolUse hooks. If `--no-graph` was used, skip.

### Step 6: Commit (prompted)

Ask the user: "Reorganization complete and verified. Create a commit? (y/n)"

If yes:
- Stage all changes: `git add -A` (safe here — this is a pure restructure, no new source code)
- Commit message:
  ```
  refactor: reorganize project structure to {framework} conventions

  - Moved {N} files to conventional directories
  - Created {K} new directories: {list}
  - Updated ~{P} import paths
  - Naming convention: {convention}
  ```

## Tips

- **Run `/composure:initialize` first** if you haven't — code-organizer needs the stack detection config
- **The code graph is required** — it provides exact import data so moves don't break things. The skill auto-builds it if the MCP server is running but no graph exists yet. `--no-graph` is only valid with `--dry-run` for analysis.
- **Start with `--dry-run`** to preview what would change before committing to it
- **Use `--preserve`** for directories you've intentionally organized differently
- **After organizing**, `/decomposition-audit` can catch remaining size violations within the now-properly-placed files
- **For new features going forward**, `/app-architecture` will guide you to put things in the right place from the start
