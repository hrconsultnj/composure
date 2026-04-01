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

Print:
```
Semgrep not installed - running manual code review and secrets scan instead.
Install with: brew install semgrep (or pip install semgrep) for deeper static analysis.
```

**Do NOT skip to the next step.** Proceed to Steps 2d and 2e below, which provide scanner-independent analysis.

## 2d. Secrets Scan (Always Runs)

This step runs regardless of Semgrep availability. Use the regex patterns from `$SENTINEL_PLUGIN_ROOT/references/general/secret-patterns.md` to grep the target directory for hardcoded secrets.

Run these high-value pattern categories against all source files in scope:

1. **Cloud provider keys:** AWS (`AKIA`), GCP (`AIza`), Azure connection strings
2. **API keys:** GitHub tokens (`ghp_`, `gho_`), OpenAI/Anthropic (`sk-`), Stripe (`sk_live_`)
3. **Private keys:** `-----BEGIN.*PRIVATE KEY-----`
4. **Database connection strings:** `(postgres|mysql|mongodb|redis)://[^:]+:[^@]+@`
5. **JWT tokens:** `eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.`
6. **Generic secrets:** Variable assignments matching `(password|secret|token|api_key|apikey|auth_token)\s*[:=]\s*["'][^"']{8,}["']`

Apply the false positive exclusions from `secret-patterns.md`: skip `.env` files, `.env.example`, test files, and comment lines.

For each match, create a finding with severity "High" and CWE-798 (Use of Hard-coded Credentials).

## 2e. Manual Code Review (Runs When Semgrep Is Not Available)

When Semgrep is not installed, read each source file in the scan scope and review for these OWASP-aligned patterns. This leverages Claude's code comprehension as a fallback static analyzer.

**Check for:**

1. **SSRF (CWE-918):** HTTP requests where the URL or hostname is built from user/external input without validation. Look for `requests.get()`, `aiohttp.ClientSession.get()`, `fetch()`, `http.Get()` where the target is variable.

2. **Command Injection (CWE-78):** User input passed to `os.system()`, `subprocess.run()`, `exec()`, `eval()`, backtick execution, or shell command construction.

3. **SQL Injection (CWE-89):** String concatenation or f-strings building SQL queries instead of parameterized queries.

4. **Broad Exception Handling (CWE-755):** Bare `except Exception` or `except:` blocks that silently swallow errors, especially around security-sensitive operations (auth, crypto, external calls). Flag when the catch block returns a default value without re-raising or alerting.

5. **Missing Input Validation (CWE-20):** Public-facing functions that accept domain names, URLs, IPs, or file paths without validation. Check for SSRF via DNS resolution of unvalidated hostnames.

6. **Insecure Deserialization (CWE-502):** `pickle.loads()`, `yaml.load()` without SafeLoader, `eval()` on external data.

7. **Missing Timeouts (CWE-400):** HTTP client calls without explicit timeout parameters that could hang indefinitely.

8. **Hardcoded Credentials (CWE-798):** Any string literal that looks like a token, password, or API key assigned to a variable (supplements the regex scan in 2d).

For each finding, record:
- File path and line number
- CWE identifier
- Severity (Critical/High/Moderate based on exploitability)
- Concrete description of the issue
- Suggested fix

Store all findings from 2d and 2e alongside Semgrep findings for use in Steps 4-5.

---

**Next:** Read `steps/03-dependency-audit.md`
