---
name: generate
description: Generate tests for a file or function. Convention-aware -- reads existing test files first to match project style. One file at a time.
argument-hint: "<file-path> [--function <name>] [--e2e]"
---

# Testbench Generate

Generate a test file for a given source file. The generated test matches the project's existing conventions -- import style, mock patterns, assertion style, file placement, and naming.

## Arguments

- `<file-path>` -- **Required.** Path to the source file to test
- `--function <name>` -- Generate tests for a specific exported function only
- `--e2e` -- Generate a Playwright/Cypress E2E test instead of a unit test

## Workflow

### Step 1: Load Config

Read `.claude/testbench.json` for conventions.

```bash
cat .claude/testbench.json 2>/dev/null
```

If the config does not exist, run `/testbench:initialize` first. Do NOT proceed without conventions -- convention-blind test generation produces generic tests that don't match the project and get deleted.

### Step 2: Read the Source File

Read the file at `<file-path>` and analyze:

| What to extract | Why |
|----------------|-----|
| Named exports | These are the public API -- test each one |
| Default export | Test this too |
| Types/interfaces | Understand input/output shapes for assertions |
| Dependencies (imports) | Determine what needs mocking |
| Side effects | Flag if the module has no testable exports |
| Complexity | Pure functions vs stateful classes vs React components vs API routes |

**If the source file has no exports** (side-effect only module, config file, type-only file):

```
Cannot generate meaningful tests for {file} -- it has no testable exports.

Options:
  - If this is a config file: no tests needed
  - If this is a type-only file (.d.ts, types.ts): no tests needed
  - If this is a side-effect module: refactor to export functions, then test those
  - If this is a React component with default export: tests will target the default export
```

Stop here. Do NOT generate a bad test to fill a gap.

### Step 3: Read Existing Test Files for Convention Context

**This step is NOT optional.** Read 2-3 existing test files from the project. Even though conventions are in `testbench.json`, reading real tests provides:

- Concrete mock setup patterns (not just "vi.mock" but the full mock factory this project uses)
- Test data creation patterns (factories, builders, fixtures)
- Common utility imports (test helpers, render wrappers, custom matchers)
- Error handling patterns (how does this project test error cases?)
- Async testing patterns (how does this project handle promises, streams, subscriptions?)

**Selection priority for convention files:**

1. A test file for a similar source file (same directory, same type of code)
2. The most recently modified test file (represents current conventions)
3. A test file that tests something with similar dependencies

Read the files. Do NOT skip this step with "I already have conventions from the config."

### Step 4: Read Framework Reference Docs

If `.claude/testing/generated/` has docs for the detected framework, read the relevant one:

```bash
ls .claude/testing/generated/ 2>/dev/null
```

This provides up-to-date API patterns -- especially useful for assertion methods, mock APIs, and async utilities that change between versions.

### Step 5: Generate the Test File

Generate the test file following ALL detected conventions. The file must look like it was written by a developer on this team, not by a generic AI.

#### 5a. Determine file path and name

Based on `conventions.fileStructure` from config:

| Structure | Source path | Test path |
|-----------|------------|-----------|
| `colocated` | `src/utils/format.ts` | `src/utils/format.test.ts` |
| `__tests__` | `src/utils/format.ts` | `src/utils/__tests__/format.test.ts` |
| `mirror` | `src/utils/format.ts` | `tests/utils/format.test.ts` |
| `flat` | `src/utils/format.ts` | `tests/format.test.ts` |

Use the detected `testPattern` for the file extension (`.test.ts`, `.spec.ts`, `_test.go`, `test_*.py`).

**If a test file already exists at the target path**: READ it, then EXTEND it with new tests for untested exports. Do NOT overwrite existing tests.

#### 5b. Structure the test file

Follow the project's conventions for:

- **Imports**: Use the exact import style from config (`import { describe, it, expect } from 'vitest'` vs globals)
- **Mocks**: Mock ONLY external dependencies (database clients, API clients, file system, network). Do NOT mock internal functions -- that creates brittle tests that break on refactors.
- **Grouping**: Match the project's `grouping` convention (describe blocks vs flat tests)
- **Naming**: Match the project's `namingStyle` (sentence vs function name)
- **Setup**: Match the project's `setupPattern` (beforeEach vs inline setup vs fixtures)

#### 5c. Test categories to generate

For each exported function/component, generate tests in this order:

1. **Happy path** -- The primary use case works correctly
2. **Edge cases** -- Empty inputs, boundary values, null/undefined handling
3. **Error cases** -- Invalid inputs, thrown errors, rejected promises
4. **Type contracts** -- Return types match expectations (especially for TypeScript)

**For React components** (detected by JSX return or `React.FC`):

1. **Renders without crashing** -- Basic render test
2. **Renders correct content** -- Key elements are present
3. **User interactions** -- Click handlers, form submissions (use Testing Library's `userEvent`)
4. **Conditional rendering** -- Different states produce different output
5. **Accessibility** -- Key elements have proper roles/labels (if Testing Library is available)

**For API route handlers** (Next.js `route.ts`, Express handlers, FastAPI endpoints):

1. **Successful response** -- Returns expected status and body
2. **Validation errors** -- Invalid input returns 400
3. **Authentication** -- Unauthenticated requests return 401
4. **Authorization** -- Unauthorized requests return 403
5. **Not found** -- Missing resources return 404

**For `--e2e` flag** (Playwright/Cypress):

1. **Page loads** -- Navigation works, key elements visible
2. **User flows** -- Complete user journeys (login, CRUD, navigation)
3. **Error states** -- Network failures, validation errors shown to user
4. **Mobile viewport** -- Test at mobile breakpoint if the project has responsive design

#### 5d. What NOT to mock

- Internal utility functions (test them through the public API)
- TypeScript types (they're compile-time only)
- Constants and configuration (use the real values)
- Pure functions called by the function under test

**Mock only the boundaries:**
- Database calls (Supabase client, Prisma, Drizzle)
- External API calls (fetch, axios)
- File system operations
- Environment variables (use `vi.stubEnv` or `process.env` override)
- Time-dependent code (`vi.useFakeTimers`, `jest.useFakeTimers`)
- Random values (`vi.spyOn(Math, 'random')`)

#### 5e. Size limits

Follow Composure decomposition limits: **max 150 lines per test file**. If the source file has many exports that would produce a test file exceeding 150 lines:

- Split into focused test files: `format.test.ts`, `format.edge-cases.test.ts`
- Or group by export: `format-dates.test.ts`, `format-currency.test.ts`

Report the split: `"Generated 2 test files (source has 8 exports, split to stay under 150 lines)"`

### Step 6: Run the Generated Test

Execute the generated test to verify it passes:

```bash
# Vitest
pnpm vitest run {test-file}

# Jest
pnpm jest {test-file}

# pytest
pytest {test-file}

# Go
go test -run {TestName} {package}

# Cargo
cargo test {test_name}
```

Use the `runSingleCommand` from config with `{file}` replaced by the test file path.

### Step 7: Fix Failures (Max 3 Attempts)

If the test fails:

1. **Read the error output** -- Parse the failure message, expected vs actual, stack trace
2. **Read the source file again** if needed -- The test may have incorrect assumptions
3. **Fix the test** -- Adjust assertions, fix mock setup, correct imports
4. **Re-run** -- Verify the fix works

Track attempts:

| Attempt | Action |
|---------|--------|
| 1 | Fix based on error message (usually import errors, mock setup, wrong assertion) |
| 2 | Re-read source file, fix deeper misunderstanding of the code's behavior |
| 3 | If still failing, write the test file anyway and report the failure clearly |

After 3 failed attempts, do NOT keep trying. Write the test file with a clear comment at the top:

```typescript
// NOTE: This test was generated by Testbench but has a failing assertion.
// The failure is: {error message}
// Manual fix needed for: {test name}
```

Report to the user:

```
Generated {file} but 1 test is failing:

  FAIL: should handle concurrent requests
  Expected: 200
  Received: 429

  This likely needs manual attention -- the rate limiting behavior
  depends on server state that's hard to mock.
```

## Rules (MUST -- non-negotiable)

1. **NEVER generate a test without reading existing tests first.** Convention context is what makes generated tests useful. Without it, you produce generic tests that get deleted.

2. **One file at a time.** Do not batch test generation across multiple source files. Each file needs focused analysis.

3. **Acknowledge limitations honestly.** Pure functions get great tests. Complex stateful components, real-time subscriptions, and multi-step UI flows get mediocre tests. Say so.

4. **Do NOT mock everything.** Mock external services (DB, API, filesystem). Do NOT mock internal functions -- that creates tests that pass but verify nothing.

5. **Follow Composure decomposition limits.** Test files max 150 lines. Split if needed.

6. **If the source file has no testable exports, say so.** Do NOT generate a useless test for a config file or type-only module.

7. **Run the test before declaring done.** A test that doesn't pass is not a deliverable -- it's a draft.

8. **Match the project's style exactly.** The test should be indistinguishable from one written by the team. If the project uses `it('should ...')`, don't use `test('...')`. If the project uses factory functions for test data, don't use inline objects.

9. **If a test file already exists, extend it -- do NOT overwrite.** Read the existing file, identify untested exports, add tests for those only.
