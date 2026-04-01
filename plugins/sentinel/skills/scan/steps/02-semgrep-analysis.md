# Step 2: Semgrep Static Analysis

If `--deps-only` was passed, skip this step entirely and proceed to Step 3.

## 2a. Run Semgrep

If Semgrep is installed (detected in `sentinel.json`):

```bash
# Run with OWASP Top 10 and language-specific rulesets
semgrep scan --config=auto --config=p/owasp-top-ten --json --quiet <target_path> 2>/dev/null
```

**Ruleset selection based on detected stack:**

| Language | Additional Rulesets |
|----------|-------------------|
| TypeScript/JavaScript | `p/javascript`, `p/typescript`, `p/react`, `p/nextjs` |
| Python | `p/python`, `p/django`, `p/flask` |
| Go | `p/golang` |
| Rust | `p/rust` |
| Ruby | `p/ruby` |
| Java | `p/java` |

Only include rulesets matching the detected framework. Do not add `p/django` for a Flask project.

If `--path <dir>` was specified, use that as `<target_path>`. Otherwise, use the project root.

## 2b. Parse Results

Parse the JSON output. For each finding, extract:

- `check_id` — the rule that matched
- `path` — file path
- `start.line` / `end.line` — location
- `extra.message` — description
- `extra.severity` — ERROR, WARNING, INFO
- `extra.metadata.cwe` — CWE identifier if available
- `extra.metadata.owasp` — OWASP category if available

Store all findings for use in Steps 4 (exposure analysis) and 5 (severity mapping).

## 2c. If Semgrep Is Not Installed

```
Semgrep is not installed — skipping static analysis.
Install with: brew install semgrep (or pip install semgrep)
Run /sentinel:initialize to update tooling detection.
```

Continue to the next step. A scan with only dependency audit is still valuable.

---

**Next:** Read `steps/03-dependency-audit.md`
