# Step 4: Parse Output

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

---

**Next:** Read `steps/05-report-and-store.md`
