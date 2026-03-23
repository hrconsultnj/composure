# Composure

*Go with the grain — write composed, decomposed code.*

A Claude Code plugin that enforces code quality, architectural discipline, and type safety across **7 languages** through automated hooks, skills, a code knowledge graph, and a severity-tracked task queue. Prevents monolithic files, blocks language-specific anti-patterns, provides impact-aware code reviews, and organizes remediation by priority.

**Supported languages:** TypeScript/JavaScript, Python, Go, Rust, C/C++, Swift, Kotlin

---

## Installation

```bash
# Add the marketplace
claude plugin marketplace add hrconsultnj/composure

# Install the plugin
claude plugin install composure@composure

# Restart Claude Code, then initialize in your project
/composure:initialize
```

For Pro Patterns (private submodule):
```bash
git submodule update --init --recursive
```

---

## Quick Start

```
/composure:initialize            # Detect stack, query Context7, build graph, generate config
/composure:app-architecture     # Feature-building guide — loads framework-specific refs
/composure:commit               # Commit with auto task queue hygiene
/composure:decomposition-audit  # Full codebase scan for size violations
/composure:review-tasks         # Process task queue (verify, delegate, archive...)
/composure:review-pr            # PR review with blast-radius analysis
/composure:review-delta         # Review changes since last commit
/composure:build-graph          # Build/update code review knowledge graph
```

---

## What You Get

### 8 Skills

| Skill | Command | Purpose |
|-------|---------|---------|
| **Initialize** | `/initialize` | Detect project stack (multi-framework), query Context7 for current API patterns, generate config, build graph, create task queue. Supports monorepos with mixed languages. |
| **App Architecture** | `/app-architecture` | Feature-building guide. Dynamically loads framework-specific patterns based on detected stack. 25+ reference docs for TypeScript, anti-pattern docs for all 7 languages. |
| **Commit** | `/commit` | Commit with task queue hygiene. Auto-cleans resolved tasks, archives completed audits, blocks if staged files have open quality tasks. |
| **Decomposition Audit** | `/decomposition-audit` | Full codebase scan. Reports Critical (800+), High (400-799), Moderate (200-399) with extraction instructions. |
| **Review Tasks** | `/review-tasks` | Process the task queue. Modes: `summary`, `batch`, `delegate`, `clean`, `verify`, `archive`. |
| **Build Graph** | `/build-graph` | Build or update the code review knowledge graph for impact analysis. |
| **Review PR** | `/review-pr` | PR review with blast-radius context from the knowledge graph. |
| **Review Delta** | `/review-delta` | Token-efficient review of changes since last commit. |

### 8 Automated Hooks (3 types)

Claude Code supports three hook types: `command` (shell scripts), `prompt` (LLM evaluation), and `agent` (mini agents with tool access). Composure uses all three.

| Hook | Type | Event | What It Does |
|------|------|-------|-------------|
| **Architecture Loader** | `command` | `SessionStart` (all) | Loads the full app-architecture skill on every session start. Ensures architectural context is always available. |
| **Task Verifier** | `agent` | `SessionStart` (resume) | On session resume, checks open tasks against actual file sizes, marks completed items. Checks graph staleness. |
| **Architecture Trigger** | `command` | `PreToolUse` (Edit/Write) | Once per session, reminds the agent to load `/app-architecture` before writing code. |
| **No Band-Aids** | `command` | `PreToolUse` (Edit/Write) | Multi-framework: blocks language-specific anti-patterns (TS: `as any`; Python: `type: ignore`; Go: `_ = err`; Rust: `.unwrap()`; Swift: `!` force unwrap; Kotlin: `!!`; C++: raw `new`). |
| **Type Safety Review** | `prompt` | `PreToolUse` (Edit/Write) | Semantic review for hidden `any` in generics, lazy types, unnecessary assertions. Runs after No Band-Aids passes. |
| **Code Quality Guard** | `command` | `PostToolUse` (Edit/Write) | Graph-aware decomposition check. Queries knowledge graph for exact function sizes, logs violations. Also tracks edit count and suggests `/simplify` after 5+ edits. |
| **Graph Update** | `command` | `PostToolUse` (Edit/Write) | Incrementally updates the code review knowledge graph when files change. |

### Multi-Framework No Band-Aids

The no-bandaids hook detects the file's language from its extension and applies the correct anti-pattern rules:

| Language | Extensions | Key Rules |
|---|---|---|
| **TypeScript/JS** | `.ts .tsx .js .jsx` | `as any`, `@ts-ignore`, `@ts-nocheck`, non-null `!`, `_unused` vars |
| **Python** | `.py` | `type: ignore`, bare `except:`, `# noqa`, `Any` type hints, `eval()`, `os.system()` |
| **Go** | `.go` | `_ = err` error swallowing, `interface{}` (use generics), `//nolint` without reason, `panic()` in libraries |
| **Rust** | `.rs` | `.unwrap()` in non-test code, `unsafe {}` without `// SAFETY:` comment |
| **C/C++** | `.cpp .cc .h .hpp` | `using namespace std` in headers, `NULL` (use `nullptr`), `#define` for constants |
| **Swift** | `.swift` | Force unwrap `!`, force cast `as!`, `try!` |
| **Kotlin** | `.kt .kts` | `!!` non-null assertion, `runBlocking`, bare `return@AsyncFunction` |

Rules are gated by the `frameworks` field in `.claude/no-bandaids.json` — only detected languages are checked.

### `/simplify` Integration

After editing 5+ source files in a session, the Code Quality Guard hook suggests running `/simplify` — a Claude-native agent that refines recently modified code for clarity, consistency, and maintainability without changing behavior. The user always decides — Claude asks via `AskUserQuestion`, never auto-runs.

### Code Review Knowledge Graph

A TypeScript MCP server (`graph/`) that builds a persistent SQLite graph of functions, imports, and call relationships using tree-sitter. Zero native dependencies — uses Node.js built-in `node:sqlite`.

**7 MCP Tools:**

| Tool | Purpose |
|------|---------|
| `build_or_update_graph` | Full or incremental build (auto-detects changed files from git) |
| `query_graph` | Pattern queries: `callers_of`, `callees_of`, `imports_of`, `importers_of`, `children_of`, `tests_for`, `inheritors_of`, `file_summary` |
| `get_review_context` | Changed files + impact analysis + source snippets + review guidance |
| `get_impact_radius` | BFS traversal showing blast radius of changes |
| `find_large_functions` | Find functions exceeding a line count threshold (default 150) |
| `semantic_search_nodes` | Search code entities by name |
| `list_graph_stats` | Node/edge counts, languages, staleness |

**How it stays current:** The `graph-update` PostToolUse hook re-parses changed files on every Edit/Write. The `decomposition-check` hook queries the graph for exact function sizes instead of using regex heuristics.

**Requirements:** Node.js 22.5+ (for `node:sqlite`). Graph stored at `.code-review-graph/graph.db` (auto-gitignored).

---

## Framework Reference Architecture

Each language has its own reference directory with curated patterns, Context7-generated docs, and anti-pattern definitions:

```
skills/app-architecture/
├── SKILL.md                    # Master skill — dynamic framework loading
├── typescript/
│   ├── SKILL.md                # TS/JS anti-patterns and patterns
│   ├── references/
│   │   ├── universal/          # 15+ curated reference docs (committed)
│   │   ├── generated/          # Context7 output (shadcn-v4, vite-8, tailwind-4, etc.)
│   │   └── private/            # Pro Patterns (git submodule)
│   └── skills/                 # TS-specific sub-skills
├── python/                     # Pydantic, mypy, FastAPI patterns
├── go/                         # Error handling, generics, context propagation
├── rust/                       # Ownership, clippy, ? operator, unsafe
├── c-cpp/                      # Smart pointers, RAII, MISRA C, const correctness
├── swift/                      # Optionals, async/await, SwiftUI, Expo native modules
└── kotlin/                     # Null safety, coroutines, Jetpack Compose, Expo native modules
```

### Context7 Generated Docs

`/initialize` queries Context7 for the latest framework APIs and writes versioned reference docs to `{lang}/references/generated/`. These contain current patterns that Claude's training data may be 10+ months behind on.

Refresh with `/initialize --force`. Skip with `--skip-context7` for offline/CI.

### Project-Level Overrides

Add project-specific patterns at `.claude/frameworks/{lang}/*.md`. These load last (highest priority) and override plugin-level refs.

To contribute patterns back: move from your project overrides to `references/universal/` and submit a PR.

---

## Per-Project Config

`/initialize` generates `.claude/no-bandaids.json` automatically:

```json
{
  "extensions": [".ts", ".tsx", ".js", ".jsx", ".py", ".go"],
  "skipPatterns": ["*.d.ts", "*.generated.*", "__pycache__/*"],
  "disabledRules": [],
  "typegenHint": "pnpm --filter @myapp/database generate",
  "frameworks": {
    "typescript": {
      "paths": ["apps/web", "packages/shared"],
      "versions": { "typescript": "5.9", "react": "19.2", "vite": "8.0" }
    },
    "python": {
      "paths": ["services/api"],
      "versions": { "python": "3.12", "fastapi": "0.115" }
    }
  },
  "generatedRefsPath": "skills/app-architecture/{lang}/references/generated"
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `extensions` | `.ts .tsx .js .jsx` | File extensions to check |
| `skipPatterns` | `*.d.ts *.generated.* *.gen.*` | Globs to skip |
| `disabledRules` | `[]` | Rule names to disable |
| `typegenHint` | `""` | Type regen command shown in error messages |
| `frameworks` | `{ "typescript": {...} }` | Detected languages with paths and versions |
| `generatedRefsPath` | `""` | Path template for Context7-generated docs |

---

## Size Limits

Enforced by the hook and architecture skill:

| Component Type | Plan at | Hard Limit | Decomposition Pattern |
|----------------|---------|------------|----------------------|
| Container/Page | 100 | 150 | Split into child presentation components |
| Presentation | 100 | 150 | Extract sub-sections into focused components |
| Dialog/Modal | 150 | 200 | Multi-step: `steps/Step1.tsx`, `steps/Step2.tsx` |
| Form (complex) | 200 | 300 | Split field groups into sub-forms |
| Hook (queries) | 80 | 120 | One entity's reads per file |
| Hook (queries + mutations) | 100 | 150 | Split: `queries.ts` + `mutations.ts` |
| Types file | 200 | 300 | Group by domain |
| Route file | 30 | 50 | Thin wrapper — import container, pass params |

---

## Task Queue

The PostToolUse hook logs issues to `tasks-plans/tasks.md`, grouped by severity:

```markdown
## Critical
- [ ] **DECOMPOSE** `security-client.tsx` (1220 lines) [2026-03-19]
  - EXTRACT: `SecurityClient` (lines 111-1220, ~1110 lines)
  - MOVE: 6 inline types to `types.ts`

## High
- [ ] **DECOMPOSE** `OrgShopsList.tsx` (739 lines) [2026-03-19]

## Moderate
- [ ] **SHARED** `security-client.tsx` [2026-03-19]
  - Types `PasskeyInfo`, `VerificationAction` already exist in shared package
```

Tasks are deduplicated and persist across sessions. Process with `/review-tasks`:

| Mode | What It Does |
|------|-------------|
| `summary` | Show categorized task counts |
| `batch` | Process tasks sequentially, mark done |
| `delegate` | Spawn parallel sub-agents for independent tasks |
| `verify` | Check file sizes against tasks, auto-mark completed items |
| `archive` | Move completed audit files to `tasks-plans/archived/`, reset queue |
| `clean` | Remove resolved `[x]` entries |

---

## Workflow

```
1. /composure:initialize
   → Detects stack (multi-framework), queries Context7, generates config,
     builds graph, ensures Context7, creates task queue
   |
2. Resume a session
   → SessionStart agent auto-verifies open tasks, checks graph staleness
   |
3. Start building a feature
   → Architecture hook fires once, loads /app-architecture with framework refs
   |
4. Write code
   → No band-aids (command) → type safety review (prompt) — layered gate
   → Rules adapt to file language (TS, Python, Go, Rust, C/C++, Swift, Kotlin)
   → Graph update hook keeps knowledge graph current
   → Code quality hook queries graph for exact function sizes, logs violations
   |
5. After 5+ edits
   → Code quality hook suggests /simplify — user decides via AskUserQuestion
   |
6. /review-tasks verify
   → Check which decomposition tasks are now resolved
   |
7. /review-tasks delegate
   → Sub-agents fix remaining issues in parallel
   |
8. /review-delta (before commit)
   → Token-efficient review of what you changed
   |
9. /commit (or git commit)
   → Auto-cleans resolved tasks, archives completed audits,
     blocks if staged files have open items
   |
10. /review-pr (before merge)
    → Full PR review with blast-radius analysis
    |
11. /decomposition-audit (periodically)
    → Full codebase health check
```

---

## Configuration

### Hook Thresholds

Edit hook scripts in `hooks/` to customize:

- `WARN_LINES=400` — file size warning
- `ALERT_LINES=600` — file size alert
- `CRITICAL_LINES=800` — file size critical
- `FUNC_MAX_LINES=150` — function size limit
- `SIMPLIFY_THRESHOLD=5` — edits before suggesting /simplify

### No Band-Aids Config

Per-project via `.claude/no-bandaids.json` (see above) or run `/initialize` to auto-generate.

---

## Requirements

- Claude Code CLI
- Node.js 22.5+ (for `node:sqlite` and WASM-based code parsers)
- `jq` (JSON parsing in hooks)
- `sqlite3` (optional — enables graph-aware decomposition checks)

**Platform support:** macOS, Linux, and Windows. The graph MCP server uses web-tree-sitter (WASM) — fully cross-platform with no native compilation. On Windows, hooks require bash via [Git for Windows](https://gitforwindows.org/) (ships Git Bash) or WSL.

---

## Licensing

### Community (Free)

**PolyForm Noncommercial 1.0.0** — [Full text](./LICENSE)

Free for personal, educational, and noncommercial use. Includes the full plugin: all hooks, graph MCP server, all 8 skills, 7 language frameworks, and 15+ universal reference documents.

**Allowed:** Personal projects, hobby work, learning, academic research, nonprofit/government use, evaluating before purchase.

### Pro ($39 — one-time, per GitHub user)

**[Purchase Pro License](https://composure.lemonsqueezy.com)** | [Commercial License Terms](./COMMERCIAL-LICENSE.md)

Everything in Community, plus:

| | Community (Free) | Pro ($39) |
|---|---|---|
| Plugin core (hooks, graph MCP, skills) | Yes | Yes |
| 7 language frameworks (TS, Python, Go, Rust, C/C++, Swift, Kotlin) | Yes | Yes |
| Universal reference docs (15+) | Yes | Yes |
| Context7 generated docs | Yes | Yes |
| **Commercial use** | No | **Yes** |
| **Pro Patterns** (battle-tested data architecture) | No | **Yes** |
| **RLS & migration patterns** | No | **Yes** |
| Updates within major version | Yes | **Yes** |
| Major version upgrades | — | **50% off ($19)** |

**Pro Patterns** include production-proven multi-tenant architecture: entity registry, ID prefix conventions, multi-level auth, privacy/role systems, contact-first patterns, metadata templates, RLS policies, role hierarchies, and migration checklists — delivered via private Git submodule.

**How it works:**
1. Purchase at the link above
2. Provide your GitHub username
3. You're added as a collaborator on the private patterns repo (within 48 hours)
4. Run `git submodule update --init --recursive` in your Composure installation

**Requires a commercial license:** freelance/contract work, agency projects, for-profit company use, redistribution.

### Privacy

Composure runs entirely on your local machine. No data collection, no telemetry, no network requests. [Full privacy policy](./PRIVACY.md).

### Contributing

By submitting a pull request, you grant the licensor the right to license your contribution under these terms and any future license terms for this project.
