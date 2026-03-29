# Step 2: Determine Scope

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

---

**Next:** Read `steps/03-execute.md`
