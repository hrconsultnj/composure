# Step 3: Execute Tests

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

---

**Next:** Read `steps/04-parse-output.md`
