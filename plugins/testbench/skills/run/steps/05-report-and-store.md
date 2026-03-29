# Step 5: Report Results and Store State

## 5a. Report Results

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

## 5b. Store Results

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

---

**Next:** If `--coverage` was passed, read `steps/06-coverage.md`. Otherwise, **Done.**
