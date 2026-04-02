# Step 3: Check Security Tooling

## Semgrep

```bash
semgrep --version 2>/dev/null
```

If Semgrep is installed, record the version.

If Semgrep is **not** installed:

1. Detect the best install command from the system installers found in Step 2:
   - `brew install semgrep` (macOS with Homebrew)
   - `pipx install semgrep` (isolated Python install)
   - `pip install semgrep` (Python pip)

2. **Use AskUserQuestion** to prompt the user:
   > "Semgrep enables deep static analysis with OWASP rulesets for `/sentinel:scan`. Would you like me to install it now (`<detected-install-cmd>`) or skip for now?"

3. **If the user agrees:** Run the install command, then verify with `semgrep --version`. Record the installed version.
4. **If the user declines:** Record semgrep as `null` in the config and continue. Note the limitation in the final report.

## Other tools (record if present, do not require):

```bash
trivy --version 2>/dev/null       # Container/filesystem scanner
grype --version 2>/dev/null       # Vulnerability scanner
syft --version 2>/dev/null        # SBOM generator
pip-audit --version 2>/dev/null   # Python dependency audit
govulncheck -version 2>/dev/null  # Go vulnerability check
```

---

**Next:** Read `steps/04-detect-integrations.md`
