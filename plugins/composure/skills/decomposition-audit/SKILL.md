---
name: decomposition-audit
description: Audit a codebase for decomposition violations — oversized files, large functions, mixed concerns, inline types. Produces a prioritized remediation plan. Works with or without code-review-graph plugin.
argument-hint: "[path or glob pattern] [--threshold N]"
---

# Decomposition Audit

Perform a comprehensive decomposition audit, produce a prioritized remediation plan, and create trackable tasks.

## Steps

### Step 1: Gather Size Data

**Strategy A — With code-review-graph (preferred, faster):**

1. Call `list_graph_stats_tool()` to verify the graph is built
2. If graph exists, call `find_large_functions_tool(min_lines=100, kind="Function")` for oversized functions
3. Call `find_large_functions_tool(min_lines=200, kind="Class")` for oversized classes
4. Call `find_large_functions_tool(min_lines=400)` to find any node type over 400 lines

**Strategy B — Without graph (fallback):**

1. Use Bash to find large source files:
   ```bash
   find . -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" | \
     grep -v node_modules | grep -v .next | grep -v dist | \
     xargs wc -l | sort -rn | head -50
   ```
2. For each file over 300 lines, use Grep to count function declarations and estimate sizes

### Step 2: Detect Mixed Concerns

For each file over 200 lines, check for these violations using Grep:

1. **Inline types in component files** (>3 type/interface definitions):
   ```
   grep -cE '^\s*(export\s+)?(interface|type)\s+\w+' FILE
   ```

2. **Multiple exported components** (>2 exports in one file):
   ```
   grep -cE '^\s*export\s+(default\s+)?(function|const)\s+[A-Z]' FILE
   ```

3. **StyleSheet.create in files with JSX** (React Native):
   ```
   grep -l 'StyleSheet\.create' FILE  # plus check for JSX
   ```

4. **Modal/Sheet inside screen files**:
   ```
   grep -l 'BottomSheet\|BottomSheetModal\|Dialog' FILE  # in page/screen files
   ```

5. **Route files with logic** (page.tsx/layout.tsx over 50 lines)

6. **Duplicate rendering patterns** — search for similar function names across files:
   ```
   grep -rn 'function render\|const render' --include="*.tsx"
   ```

### Step 3: Persist Results to Plan File (MANDATORY)

**BEFORE reporting to the user**, write findings to a plan file:

1. Create `tasks-plans/decomposition-audit-{YYYY-MM-DD}.md` at the project root
2. Use the report template below with checkboxes for every actionable item
3. Group by phase (highest impact first) with clear decomposition instructions

This ensures findings survive across sessions and can be picked up by any future conversation.

### Step 4: Create TaskCreate Entries (MANDATORY)

After writing the plan file, create `TaskCreate` entries for **Critical and High priority items** so they're visible in the current session:

```
Priority mapping:
  🔴 Critical (>2x limit) → TaskCreate with metadata: { priority: "critical" }
  🟡 High (1.5-2x limit) → TaskCreate with metadata: { priority: "high" }
  🟢 Moderate (1-1.5x)   → Do NOT create TaskCreate (too noisy) — plan file only
```

Each TaskCreate should:
- **subject**: Short imperative — e.g., "Decompose create-user-sheet/index.tsx (834→200 lines)"
- **description**: Include the file path, current lines, target limit, and specific decomposition steps from the audit
- **activeForm**: "Decomposing {filename}"
- **metadata**: `{ priority: "critical"|"high", lines: N, limit: N, plan: "tasks-plans/decomposition-audit-{date}.md" }`

### Step 5: Produce Summary Report

Output a structured report with three tiers:

```markdown
# Decomposition Audit Report

## Critical (MUST fix — over 2x size limits)

| # | File | Lines | Limit | Issue | Recommended Action |
|---|------|-------|-------|-------|--------------------|
| 1 | `path/to/file.tsx` | 1,200 | 200 | 3 components, 8 inline types | Split into folder, extract types.ts |

## High (Should fix — 1.5-2x limits)
...

## Moderate (Consider — 1-1.5x limits)
...

## Summary

- **Critical**: N files → TaskCreate entries created
- **High**: N files → TaskCreate entries created
- **Moderate**: N files → plan file only
- **Plan file**: `tasks-plans/decomposition-audit-{date}.md`
```

### Step 6: Suggest Execution Order

After the report, suggest an execution order based on:
1. **Blast radius** — files imported by many others should be decomposed first (use code-review-graph `importers_of` if available)
2. **Churn frequency** — files changed often (check `git log --format="%H" --follow FILE | wc -l`)
3. **Coupling** — files with many mixed concerns are easier to decompose than tightly coupled ones

## Arguments

- **No arguments**: Audit the entire project
- **Path**: Audit only files matching the path (e.g., `src/components/`)
- **`--threshold N`**: Change the minimum line count for reporting (default: 200)

## Notes

- This skill is **project-agnostic** — works on any TypeScript/JavaScript codebase
- The code-review-graph plugin provides precise AST-based function sizes; the shell fallback uses line-counting heuristics
- Run periodically (e.g., before major releases) or when joining a new codebase
- Combine with `/build-graph` for best results
- **Plan files go in `tasks-plans/`** at the project root (gitignored or tracked — your choice)
- **TaskCreate entries** make findings visible in the current session; the plan file makes them persistent
