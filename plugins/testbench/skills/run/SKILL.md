---
name: run
description: Run tests -- all, changed files only, or for a specific file. Parse output, show failures with source context.
argument-hint: "[all|changed|<file-path>] [--watch] [--coverage]"
---

# Testbench Run

Run tests and parse the output into actionable failure reports with source context. Supports full suite, changed-files-only, and single-file modes.

## Arguments

- No argument or `all` -- Run the full test suite
- `changed` -- Run tests only for files changed since last commit
- `<file-path>` -- Run tests for a specific source or test file
- `--watch` -- Start tests in watch mode (framework must support it)
- `--coverage` -- Run with coverage reporting, analyze uncovered functions

## Workflow

### Step 1: Load Config

Read `.claude/testbench.json` for run commands and framework info.

```bash
cat .claude/testbench.json 2>/dev/null
```

If the config does not exist:

```
Testbench not initialized. Run /testbench:initialize first.
```

Stop here. Do NOT guess run commands -- the wrong command wastes time and produces confusing output.

### Step 2: Determine Scope

#### No argument or `all`

Run the full test suite using `runCommand` from config.

#### `changed`

Detect changed files and run only their tests:

```bash
# Staged + unstaged changes
git diff --name-only HEAD
# Also include untracked files
git ls-files --others --exclude-standard
```

Filter the file list to source files only (exclude test files, configs, docs, generated files). Then find the corresponding test file for each changed source file using the conventions from config:

| `fileStructure` | Source file | Test file lookup |
|----------------|------------|------------------|
| `colocated` | `src/utils/format.ts` | `src/utils/format.test.ts` |
| `__tests__` | `src/utils/format.ts` | `src/utils/__tests__/format.test.ts` |
| `mirror` | `src/utils/format.ts` | `tests/utils/format.test.ts` |

If a changed file IS a test file, include it directly.

If a changed source file has no corresponding test file, note it but don't fail:

```
Changed files with no tests:
  - src/utils/newHelper.ts (run /testbench:generate src/utils/newHelper.ts)
```

Run framework-specific changed commands:

| Framework | Command |
|-----------|---------|
| Vitest | `pnpm vitest run --changed` or `pnpm vitest run {file1} {file2}` |
| Jest | `pnpm jest --changedSince=HEAD` or `pnpm jest {file1} {file2}` |
| pytest | `pytest {file1} {file2}` or `pytest --last-failed` |
| Go | `go test {package1} {package2}` |
| Cargo | `cargo test {test1} {test2}` |

Use the `runChangedCommand` from config if available. Otherwise construct from the framework.

#### `<file-path>`

Determine if the path is a source file or test file:

- If it matches the `testPattern` (e.g., `*.test.ts`): run it directly
- If it's a source file: find the corresponding test file using convention patterns

If no test file exists for the source file:

```
No test file found for {file-path}.
Run /testbench:generate {file-path} to create one.
```

Run the single test:

| Framework | Command |
|-----------|---------|
| Vitest | `pnpm vitest run {test-file}` |
| Jest | `pnpm jest {test-file}` |
| pytest | `pytest {test-file}` |
| Go | `go test -v -run {TestFunc} {package}` |
| Cargo | `cargo test {test_name} -- --nocapture` |

Use `runSingleCommand` from config with `{file}` replaced.

### Step 3: Execute Tests

Run the determined command. Capture both stdout and stderr.

```bash
# Example: Vitest
pnpm vitest run 2>&1

# Example: pytest with verbose output for parsing
pytest -v 2>&1

# Example: Go with verbose
go test -v ./... 2>&1
```

**For `--watch` mode**: Start the command and report that watch mode is active. The user will see live output.

| Framework | Watch command |
|-----------|-------------|
| Vitest | `pnpm vitest` (watch is default) or `pnpm vitest --watch` |
| Jest | `pnpm jest --watch` |
| pytest | `pytest-watch` or `ptw` (if installed) |
| Go | `go test -v ./...` (re-run manually -- no built-in watch) |

**Timeout**: Set a reasonable timeout based on scope:

| Scope | Timeout |
|-------|---------|
| Single file | 30 seconds |
| Changed files | 60 seconds |
| Full suite | 300 seconds (5 minutes) |
| Watch mode | No timeout (background) |

### Step 4: Parse Output

Parse the test output to extract structured results. Each framework has different output formats:

#### Vitest output parsing

Look for:
- `PASS` / `FAIL` markers per file
- `expected` / `received` blocks for assertion failures
- `Error:` lines for runtime errors
- Summary line: `Tests: X passed, Y failed, Z total`

#### Jest output parsing

Look for:
- Test suite results per file
- `Expected:` / `Received:` blocks
- Stack traces with file:line info
- Summary: `Tests: X passed, Y failed, Z total`

#### pytest output parsing

Look for:
- `PASSED` / `FAILED` / `ERROR` markers
- `AssertionError:` blocks with comparison
- `short test summary info` section
- Summary: `X passed, Y failed in Z seconds`

#### Go test output parsing

Look for:
- `--- PASS:` / `--- FAIL:` lines
- `got` / `want` comparison patterns
- `FAIL {package}` summary lines
- Total: `ok` or `FAIL` per package

#### Cargo test output parsing

Look for:
- `test {name} ... ok` / `test {name} ... FAILED`
- `failures:` section with details
- Summary: `test result: {ok|FAILED}. X passed; Y failed`

### Step 5: Report Results

#### All tests pass

```
All tests passed.

  142 passed | 0 failed | 0 skipped
  Duration: 3.2s
```

Short and clean. No need for verbose output when everything works.

#### Tests fail

For each failure, show:

1. **Test name** -- The full describe/it path or test function name
2. **File and line** -- Where the failing assertion lives
3. **Expected vs Actual** -- The assertion comparison
4. **Source context** -- Read the source file being tested to show relevant code

Format:

```
3 of 142 tests failed.

FAIL  src/utils/format.test.ts > formatCurrency > should handle negative amounts
  Line 45: expect(formatCurrency(-100)).toBe('-$100.00')
  Expected: '-$100.00'
  Received: '($100.00)'

  Source (src/utils/format.ts:23):
    export function formatCurrency(amount: number): string {
      if (amount < 0) return `(${Math.abs(amount).toFixed(2)})`;  // <-- accounting format
      return `$${amount.toFixed(2)}`;
    }

  The function uses accounting format (parentheses) for negatives,
  but the test expects dash prefix. Update the test or the function.

FAIL  src/hooks/useAuth.test.ts > useAuth > should redirect on session expiry
  Line 78: expect(mockRouter.push).toHaveBeenCalledWith('/login')
  Expected: call with '/login'
  Received: not called

  This mock may not be set up correctly -- check that the router
  mock is wired to the component's context.

FAIL  src/api/users.test.ts > createUser > should validate email format
  Line 112: expect(result.error).toBe('Invalid email')
  Expected: 'Invalid email'
  Received: undefined

  The validation function may have changed -- check if it now
  throws instead of returning an error object.
```

**Read the source file** for each failure to provide meaningful context. Don't just parrot the test runner output -- explain what the code does and why the test might be wrong.

#### Skipped tests

If tests are skipped (`.skip`, `@skip`, `t.Skip()`), report them separately:

```
Skipped: 4 tests
  - src/utils/format.test.ts: 'should handle locale formatting' (TODO)
  - src/api/users.test.ts: 'should handle rate limiting' (.skip)
```

### Step 6: Store Results

Write results to `.claude/testbench-state.json`:

```json
{
  "lastRun": "2026-03-27T14:30:00Z",
  "scope": "all",
  "total": 142,
  "passed": 139,
  "failed": 3,
  "skipped": 4,
  "duration": "3.2s",
  "failures": [
    {
      "test": "formatCurrency > should handle negative amounts",
      "file": "src/utils/format.test.ts",
      "line": 45,
      "expected": "-$100.00",
      "received": "($100.00)"
    },
    {
      "test": "useAuth > should redirect on session expiry",
      "file": "src/hooks/useAuth.test.ts",
      "line": 78,
      "expected": "call with '/login'",
      "received": "not called"
    },
    {
      "test": "createUser > should validate email format",
      "file": "src/api/users.test.ts",
      "line": 112,
      "expected": "'Invalid email'",
      "received": "undefined"
    }
  ],
  "changedFilesWithoutTests": [
    "src/utils/newHelper.ts"
  ]
}
```

This state file is read by:
- The `test-coverage-nudge.sh` hook (to avoid nudging for files that were just tested)
- Future `/testbench:run changed` calls (to compare against previous runs)
- The report summary to show trends ("3 new failures since last run")

### Step 7: Coverage Analysis (--coverage flag)

If `--coverage` is passed, run the coverage command from config:

```bash
# Vitest
pnpm vitest run --coverage

# Jest
pnpm jest --coverage

# pytest
pytest --cov=src --cov-report=term-missing

# Go
go test -coverprofile=coverage.out ./... && go tool cover -func=coverage.out

# Cargo
cargo tarpaulin --out Stdout
```

Use `coverageCommand` from config if available.

#### 7a. Parse coverage output

Extract per-file coverage percentages. Identify:

- **Uncovered files** -- Source files with 0% coverage (no tests at all)
- **Under-threshold files** -- Files below the `coverageThreshold` from config
- **Uncovered functions** -- Specific exported functions with no test coverage

#### 7b. Composure graph integration

If `composureIntegration` is true in config and the Composure graph MCP is available, enhance coverage analysis:

```
# Query the graph to find high-impact untested functions
query_graph({ pattern: "callers_of", target: "{uncovered-function}" })
```

Functions with many callers but no tests are high-risk. Prioritize them:

```
Coverage: 78% lines, 82% functions

Under threshold (target: 70% lines, 80% functions):
  src/utils/validation.ts         45% lines   (6 callers in graph -- HIGH PRIORITY)
  src/hooks/usePermissions.ts     62% lines   (4 callers)
  src/api/billing.ts              58% lines   (3 callers)

Uncovered exports (0 test coverage):
  src/utils/validation.ts:
    - validatePhoneNumber  (called by 3 files)
    - sanitizeHtml         (called by 5 files -- HIGH PRIORITY)
  src/api/billing.ts:
    - calculateProration   (called by 2 files)

Run /testbench:generate src/utils/validation.ts to add tests for the highest-impact file.
```

Without the Composure graph, report coverage without caller analysis:

```
Coverage: 78% lines, 82% functions

Under threshold:
  src/utils/validation.ts    45% lines
  src/hooks/usePermissions.ts  62% lines
  src/api/billing.ts         58% lines

Run /testbench:generate <file> to improve coverage.
```

#### 7c. Update state with coverage

Add coverage data to `.claude/testbench-state.json`:

```json
{
  "lastRun": "2026-03-27T14:30:00Z",
  "scope": "all",
  "total": 142,
  "passed": 142,
  "failed": 0,
  "skipped": 0,
  "duration": "4.8s",
  "failures": [],
  "coverage": {
    "lines": 78,
    "functions": 82,
    "branches": 65,
    "meetsThreshold": false,
    "underThreshold": [
      { "file": "src/utils/validation.ts", "lines": 45 },
      { "file": "src/hooks/usePermissions.ts", "lines": 62 },
      { "file": "src/api/billing.ts", "lines": 58 }
    ],
    "uncoveredExports": [
      { "file": "src/utils/validation.ts", "function": "validatePhoneNumber" },
      { "file": "src/utils/validation.ts", "function": "sanitizeHtml" },
      { "file": "src/api/billing.ts", "function": "calculateProration" }
    ]
  }
}
```

## Notes

- This skill reads config but never modifies `testbench.json` -- only `testbench-state.json` is written
- Test output parsing is best-effort -- framework output formats vary between versions. If parsing fails, show the raw output
- The `--watch` flag starts a background process -- use `run_in_background` to avoid blocking
- For monorepos, scope detection uses the `testDir` from config. If the project has workspace-level test commands, prefer those
- Coverage analysis with Composure graph is opportunistic -- if the graph MCP is unavailable, coverage still works without caller analysis
- The state file is ephemeral -- it's meant for session-level tracking, not version control. Add `.claude/testbench-state.json` to `.gitignore`
- When reporting failures, always read the source file to provide context. Raw test output is noise without understanding what the code does
