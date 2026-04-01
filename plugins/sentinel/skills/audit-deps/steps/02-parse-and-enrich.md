# Step 2: Parse and Enrich Results

For each vulnerability found (from the audit tool and from banned-packages cross-reference), determine the **highest safe version** — not just "latest".

## Version Resolution by Ecosystem

**For npm/pnpm/yarn packages:**

```bash
# Get all available versions
npm view <package> versions --json 2>/dev/null
```

Then determine the safe upgrade target:

1. **If a patched version exists in the same major.minor**: recommend that (e.g., `4.17.20` -> `4.17.21`)
2. **If no patch exists but a minor bump has the fix**: recommend the minor (e.g., `4.17.20` -> `4.18.0`)
3. **If only a major version has the fix**: flag it as a breaking change and recommend with a warning
4. **Never blindly recommend "latest"** — it may introduce breaking changes unrelated to the CVE

**For Python packages:**

```bash
pip index versions <package> 2>/dev/null
```

**For Go modules:**

```bash
go list -m -versions <module> 2>/dev/null
```

## Enrichment Details

For each finding, collect:

- Package name and installed version
- CVE/GHSA identifier(s)
- Vulnerability description
- Severity level (CRITICAL, HIGH, MODERATE)
- Fixed version with upgrade type (patch/minor/major)
- Whether the dependency is direct or transitive
- The appropriate upgrade command for the detected package manager

For banned package findings, note that these require **replacement** (switching to an alternative), not just a version upgrade.

---

**Next:** Read `steps/03-report-findings.md`
