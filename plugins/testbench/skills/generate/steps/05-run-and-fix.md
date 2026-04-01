# Step 5: Run and Fix (MANDATORY)

## 5a. Re-read the source file

Before running, re-read the source file to catch any changes since step 2. If the source has changed (different imports, renamed functions, different exception types), update the generated test to match **before** the first run. This avoids wasting retry attempts on stale assumptions.

## 5b. Run the generated test

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

## 5c. Fix failures (max 3 attempts)

If the test fails, read the error, fix the test, re-run. Max 3 attempts -- after 3, write the test with a comment noting the failure and report it to the user. Do NOT keep retrying beyond 3.

**Done.**
