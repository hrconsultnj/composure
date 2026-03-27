---
name: initialize
description: Detect test framework, read existing test conventions, generate .claude/testbench.json config. Query Context7 for test framework reference docs. Run once per project.
argument-hint: "[--force] [--dry-run] [--skip-context7]"
---

# Testbench Initialize

Bootstrap Testbench project-level configuration by detecting the test framework, learning conventions from existing tests, querying up-to-date test framework docs, and generating the config.

## Arguments

- `--force` -- Overwrite existing `.claude/testbench.json`, regenerate test framework docs older than 7 days
- `--dry-run` -- Show what would be generated without writing files
- `--skip-context7` -- Skip Context7 queries (for offline/CI use)

## Workflow

### Step 1: Detect Test Framework

Check if Composure or Sentinel have already profiled the project:

```bash
cat .claude/no-bandaids.json 2>/dev/null
cat .claude/sentinel.json 2>/dev/null
```

If either exists, extract `frameworks`, `packageManager`, and `language` fields -- no need to re-detect the base stack.

Then detect test frameworks by reading config files and dependencies:

| Signal | Framework | Config file |
|--------|-----------|-------------|
| `vitest` in devDependencies | Vitest | `vitest.config.ts`, `vitest.config.js`, `vite.config.ts` (with test block) |
| `jest` in devDependencies | Jest | `jest.config.*`, `package.json` jest field |
| `@playwright/test` in devDependencies | Playwright | `playwright.config.ts`, `playwright.config.js` |
| `@testing-library/*` in devDependencies | Testing Library | (no config -- used alongside Vitest/Jest) |
| `cypress` in devDependencies | Cypress | `cypress.config.*`, `cypress/` directory |
| `pytest` in requirements.txt or `[tool.pytest]` in pyproject.toml | pytest | `pytest.ini`, `pyproject.toml`, `conftest.py` |
| `_test.go` files present | Go test | (built-in -- no config file) |
| `Cargo.toml` present with `[dev-dependencies]` | Cargo test | (built-in -- no config file) |
| `rspec` in Gemfile | RSpec | `.rspec`, `spec/` directory |
| `phpunit` in composer.json | PHPUnit | `phpunit.xml` |

**Priority when multiple are detected**: A project can have BOTH a unit test framework (Vitest/Jest/pytest) AND an E2E framework (Playwright/Cypress). Record both -- they serve different purposes.

Build a framework profile:

```json
{
  "unit": { "framework": "vitest", "configFile": "vitest.config.ts" },
  "e2e": { "framework": "playwright", "configFile": "playwright.config.ts" },
  "testingLibrary": true,
  "language": "typescript"
}
```

If NO test framework is detected at all, report this clearly and still generate a minimal config:

```
No test framework detected. Consider adding one:
  - TypeScript/JavaScript: vitest (fast, Vite-native, ESM-first)
  - Python: pytest (de facto standard)
  - Go: built-in (go test)

Generated a minimal .claude/testbench.json. Run /testbench:initialize again after adding a framework.
```

### Step 2: Convention Detection

**This step is critical.** The value of Testbench over generic test generation is convention awareness. READ 2-3 existing test files to learn how THIS project writes tests.

#### 2a. Find existing test files

```bash
# Find test files by common patterns (limit to 20, most recently modified first)
find . -type f \( -name "*.test.*" -o -name "*.spec.*" -o -name "*_test.*" -o -name "test_*" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/dist/*" \
  -not -path "*/.expo/*" \
  | head -20
```

If no test files are found, skip convention detection and use sensible defaults based on the framework.

#### 2b. Read 2-3 test files and extract conventions

Pick 2-3 test files that represent different areas of the codebase (e.g., one utility test, one component test, one API test). Read each and extract:

| Convention | What to look for | Examples |
|-----------|-----------------|----------|
| **Import style** | How test globals are imported | `import { describe, it, expect } from 'vitest'` vs globals vs `import { test } from '@playwright/test'` |
| **Mock pattern** | How the project mocks dependencies | `vi.mock(...)`, `jest.mock(...)`, `monkeypatch`, `httpx.AsyncClient`, manual mock files in `__mocks__/` |
| **Assertion style** | Which assertion API is used | `expect().toBe()`, `expect().toEqual()`, `assert.equal()`, `assert`, `t.Equal()` |
| **File structure** | Where tests live relative to source | Colocated (`src/foo.test.ts`), mirror (`__tests__/foo.test.ts`), separate (`tests/test_foo.py`) |
| **Setup pattern** | How test fixtures/state are initialized | `beforeEach`/`afterEach`, `beforeAll`, pytest fixtures, `t.Cleanup()`, factory functions |
| **Naming style** | How test cases are named | Sentence style (`'should handle empty input'`), function name style (`'handleEmptyInput'`), BDD (`'given X when Y then Z'`) |
| **Grouping** | How tests are organized within a file | `describe` blocks, flat `test()` calls, test classes, subtests |
| **Data patterns** | How test data is created | Inline objects, factory functions, fixtures files, builders |

Record all detected conventions. When files disagree (e.g., one uses `describe`, another uses flat `test`), prefer the pattern used in the majority.

#### 2c. Detect test directory and file patterns

From the test files found, determine:

- **Test directory**: `src/__tests__/`, `tests/`, `test/`, `spec/`, or colocated (no dedicated dir)
- **Test file pattern**: `*.test.ts`, `*.spec.ts`, `*.test.tsx`, `test_*.py`, `*_test.go`
- **Test file naming**: Does the test file name match the source file? (`utils.ts` -> `utils.test.ts`)

### Step 3: Query Context7 for Test Framework Docs

**Same sequential pattern as Composure**: resolve -> query -> write -> next library.

Only query for DETECTED frameworks -- don't generate Playwright docs if no Playwright.

#### 3a. Create directory structure

```
.claude/testing/generated/       <-- Context7-sourced test framework docs
.claude/testing/project/         <-- team-written test conventions (never auto-generated)
```

Run `mkdir -p` for both directories.

#### 3b. Freshness check

Before querying Context7, check if a generated doc already exists:

```bash
stat -f "%m" .claude/testing/generated/{file} 2>/dev/null || stat -c "%Y" .claude/testing/generated/{file} 2>/dev/null
```

- **If the doc exists and is < 7 days old**: skip. Report: `"{framework} docs are fresh ({N} days old) -- skipping"`
- **If the doc exists and is >= 7 days old**: regenerate
- **If `--force` is passed**: regenerate docs >= 7 days old. Docs < 7 days old are STILL skipped
- **If the doc doesn't exist**: generate it

#### 3c. Build library task list

From the detected test frameworks, build a list of `{ library, outputPath, focusAreas }` tuples:

```
Framework detected        ->  Output path                                    ->  Focus areas
------------------------------------------------------------------------------------------------------------
vitest                    ->  .claude/testing/generated/01-vitest.md          ->  config, mocking (vi.mock), coverage, workspace
jest                      ->  .claude/testing/generated/01-jest.md            ->  config, mocking (jest.mock), coverage, transforms
@playwright/test          ->  .claude/testing/generated/02-playwright.md      ->  config, selectors, fixtures, assertions, mobile
@testing-library/react    ->  .claude/testing/generated/03-testing-library.md ->  queries, user-event, act, async utilities
cypress                   ->  .claude/testing/generated/02-cypress.md         ->  config, commands, intercept, component testing
pytest                    ->  .claude/testing/generated/01-pytest.md          ->  fixtures, parametrize, monkeypatch, async
rspec                     ->  .claude/testing/generated/01-rspec.md           ->  matchers, let/subject, shared examples, mocks
```

#### 3d. Query Context7 and write -- one library at a time

**Read `GENERATED-DOC-TEMPLATE.md` from the Composure plugin** (if available) for the doc template structure. If not available, use this minimal structure:

```markdown
---
name: {Framework} Testing Patterns
source: context7
queried_at: {YYYY-MM-DD}
library_version: {version}
context7_library_id: {/org/project}
---

# {Framework} Testing

## Setup
## Key Patterns
## Anti-Patterns
## Migration (if applicable)
```

For each library in the task list, if it passed the freshness check:

1. **Resolve**: Call `resolve-library-id` with `libraryName="{library}"` -- pick highest benchmark score with "High" reputation
2. **Query (BROAD)**: Call `query-docs` -- setup, key patterns, config. Focus areas: `{focusAreas}`
3. **Query (TARGETED)**: Call `query-docs` -- specifically for mocking patterns, assertion patterns, async testing
4. If results are sparse, try a DIFFERENT library ID from resolve results
5. **Validate** before writing:
   - If Context7 returned no data after 3+ attempts -> skip, report as "no Context7 data available"
   - If `resolve-library-id` returned no results -> skip, report as "library not found in Context7"
   - If `context7_library_id` would be `manual`, `n/a`, or missing -> **REJECT**
   - If content contains no code blocks from Context7 -> **REJECT**
6. **Write the doc immediately** -- `mkdir -p` then write
7. **Move to the next library**

**MUST rules (non-negotiable):**
- MUST source ALL content from Context7. NEVER use training data.
- MUST include a valid `context7_library_id` in frontmatter.
- MUST NOT fabricate. If Context7 returns nothing after 3 attempts, skip.
- Aim for 200-500 lines with complete code examples from Context7.

**If Context7 is unavailable** (`--skip-context7`): skip this entire step.

### Step 4: Generate Config

Create `.claude/testbench.json`:

```json
{
  "version": "1.0.0",
  "detectedAt": "2026-03-27",
  "framework": "vitest",
  "testDir": "src/__tests__",
  "testPattern": "*.test.ts",
  "conventions": {
    "importStyle": "import { describe, it, expect } from 'vitest'",
    "mockPattern": "vi.mock('@supabase/supabase-js')",
    "assertionStyle": "expect().toBe()",
    "fileStructure": "colocated",
    "setupPattern": "beforeEach",
    "namingStyle": "sentence",
    "grouping": "describe",
    "dataPatterns": "inline"
  },
  "e2e": {
    "framework": "playwright",
    "configFile": "playwright.config.ts",
    "baseUrl": "http://localhost:3000"
  },
  "runCommand": "pnpm test",
  "runSingleCommand": "pnpm vitest run {file}",
  "runChangedCommand": "pnpm vitest run --changed",
  "coverageCommand": "pnpm vitest run --coverage",
  "coverageThreshold": {
    "lines": 70,
    "functions": 80
  },
  "composureIntegration": true,
  "sentinelIntegration": false,
  "generatedDocsRoot": ".claude/testing"
}
```

**Field explanations:**

| Field | Source | Purpose |
|-------|--------|---------|
| `framework` | Step 1 detection | Primary unit test framework |
| `testDir` | Step 2 convention scan | Where test files live |
| `testPattern` | Step 2 convention scan | Glob for test file names |
| `conventions` | Step 2 convention scan | How to write tests matching project style |
| `e2e` | Step 1 detection | E2E framework info (null if none) |
| `runCommand` | package.json scripts or framework default | How to run all tests |
| `runSingleCommand` | Framework-specific pattern | How to run a single test file (`{file}` placeholder) |
| `runChangedCommand` | Framework-specific pattern | How to run tests for changed files |
| `coverageCommand` | package.json scripts or framework default | How to run with coverage |
| `coverageThreshold` | Existing config or sensible default | Target coverage percentages |
| `composureIntegration` | Check for `.claude/no-bandaids.json` | Whether Composure graph is available |
| `sentinelIntegration` | Check for `.claude/sentinel.json` | Whether Sentinel is available |

**Run command detection priority:**

1. `package.json` scripts: look for `test`, `test:unit`, `test:e2e`, `test:coverage`
2. Framework config: extract from `vitest.config.ts`, `jest.config.*`, `pyproject.toml`
3. Framework defaults: `pnpm vitest run`, `pnpm jest`, `pytest`, `go test ./...`, `cargo test`

If `--dry-run`, print the JSON to stdout without writing.

If the file already exists and `--force` is not passed, skip generation:

```
.claude/testbench.json already exists. Use --force to overwrite.
```

### Step 5: Report

Print a summary:

```
Testbench initialized for <project-name>

Test framework:
  - Unit: Vitest (vitest.config.ts)
  - E2E: Playwright (playwright.config.ts)
  - Testing Library: @testing-library/react

Conventions detected (from 3 test files):
  - Import style: import { describe, it, expect } from 'vitest'
  - Mock pattern: vi.mock(...)
  - Assertion style: expect().toBe()
  - File structure: colocated (src/foo.test.ts)
  - Setup: beforeEach
  - Naming: sentence style ('should handle empty input')

Commands:
  - Run all: pnpm test
  - Run single: pnpm vitest run {file}
  - Run changed: pnpm vitest run --changed
  - Coverage: pnpm vitest run --coverage

Generated:
  - .claude/testbench.json (config)
  - .claude/testing/generated/ (2 docs: vitest, playwright)

Plugin integrations:
  - Composure: yes (graph available for coverage analysis)
  - Sentinel: no

Active hooks:
  - SessionStart: init-check (reminds if not initialized)
  - PostToolUse: test-coverage-nudge (suggests /testbench:generate for untested files)

Available skills:
  /testbench:generate  -- Generate convention-aware tests for a file
  /testbench:run       -- Run tests, parse failures, show context
```

## Notes

- This skill is idempotent -- running it again updates the config based on current state
- With `--force`, it overwrites config and regenerates framework docs older than 7 days (fresh docs still skipped)
- With `--dry-run`, it prints what would be generated without writing files
- With `--skip-context7`, it skips Context7 queries (framework docs not generated)
- Composure and Sentinel configs are read but never modified -- Testbench is a consumer, not a producer
- Convention detection reads EXISTING test files only -- it never invents conventions
- If no test files exist yet, defaults are chosen based on the framework's community norms
- `.claude/testing/project/` is for team-written test conventions -- never auto-generated
- Generated test framework docs are `.gitignore`d by default
