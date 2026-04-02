# Step 2: Convention Detection

**This step is critical.** The value of Testbench over generic test generation is convention awareness. READ 2-3 existing test files to learn how THIS project writes tests.

## 2a. Find existing test files

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

## 2b. Read 2-3 test files and extract conventions

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

## 2c. Detect test directory and file patterns

From the test files found, determine:

- **Test directory**: `src/__tests__/`, `tests/`, `test/`, `spec/`, or colocated (no dedicated dir)
- **Test file pattern**: `*.test.ts`, `*.spec.ts`, `*.test.tsx`, `test_*.py`, `*_test.go`
- **Test file naming**: Does the test file name match the source file? (`utils.ts` -> `utils.test.ts`)

---

**Next:** Read `steps/03-context7-queries.md`
