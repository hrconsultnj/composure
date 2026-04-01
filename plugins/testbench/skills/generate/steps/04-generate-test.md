# Step 4: Generate the Test File

## 4a. Read framework reference docs

If `.claude/testing/generated/` has docs for the detected framework, read the relevant one:

```bash
ls .claude/testing/generated/ 2>/dev/null
```

This provides up-to-date API patterns -- especially useful for assertion methods, mock APIs, and async utilities that change between versions.

## 4b. Determine file path and name

Based on `conventions.fileStructure` from config:

| Structure | Source path | Test path |
|-----------|------------|-----------|
| `colocated` | `src/utils/format.ts` | `src/utils/format.test.ts` |
| `__tests__` | `src/utils/format.ts` | `src/utils/__tests__/format.test.ts` |
| `mirror` | `src/utils/format.ts` | `tests/utils/format.test.ts` |
| `flat` | `src/utils/format.ts` | `tests/format.test.ts` |

Use the detected `testPattern` for the file extension (`.test.ts`, `.spec.ts`, `_test.go`, `test_*.py`).

**If a test file already exists at the target path**: READ it, then EXTEND it with new tests for untested exports. Do NOT overwrite existing tests.

## 4c. Python: Check for conftest.py

**Skip this step for non-Python projects.**

If the test directory does not have a `conftest.py` and the source package uses relative imports (`from .module import ...`), generate a `conftest.py` that bootstraps the import path. This prevents every test file from reinventing the same import hack. See `references/pytest/patterns.md` for the fake package approach.

If a `conftest.py` already exists, read it to understand the existing import setup and reuse it.

## 4d. Structure the test file

Follow the project's conventions for:

- **Imports**: Use the exact import style from config (`import { describe, it, expect } from 'vitest'` vs globals)
- **Mocks**: Mock ONLY external dependencies (database clients, API clients, file system, network). Do NOT mock internal functions -- that creates brittle tests that break on refactors.
- **Grouping**: Match the project's `grouping` convention (describe blocks vs flat tests)
- **Naming**: Match the project's `namingStyle` (sentence vs function name)
- **Setup**: Match the project's `setupPattern` (beforeEach vs inline setup vs fixtures)

## 4d. Test categories to generate

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

## 4e. What NOT to mock

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

## 4f. Size limits

Follow Composure decomposition limits, adjusted by language and test type:

| Context | Soft limit |
|---------|-----------|
| JS/TS component tests | 150 lines |
| Python module tests (multiple methods/helpers) | 250 lines |
| Integration / E2E tests | No hard limit -- use judgment |

If the source file has many exports that would exceed the limit:

- Split into focused test files: `format.test.ts`, `format.edge-cases.test.ts`
- Or group by export: `format-dates.test.ts`, `format-currency.test.ts`

Report the split: `"Generated 2 test files (source has 8 exports, split to stay under limit)"`

---

**Next:** Read `steps/05-run-and-fix.md`
