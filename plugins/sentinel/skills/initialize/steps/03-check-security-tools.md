# Step 3: Check Security Tooling

## Semgrep

```bash
semgrep --version 2>/dev/null
```

If Semgrep is installed, record the version. If not:

```
Semgrep is not installed. It provides static analysis with OWASP rulesets.

Install with:
  brew install semgrep          # macOS (Homebrew)
  pip install semgrep           # Python pip
  pipx install semgrep          # Isolated Python install

Semgrep is optional but enables /sentinel:scan for deep static analysis.
```

Use the detected system installer to recommend the appropriate install command.

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
