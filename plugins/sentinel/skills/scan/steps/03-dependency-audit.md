# Step 3: Dependency Audit

If `--semgrep-only` was passed, skip this step entirely and proceed to Step 4.

## 3a. Run Package Manager Audit

Determine the audit command from the detected package manager in `sentinel.json`:

| Package Manager | Audit Command |
|----------------|--------------|
| pnpm | `pnpm audit --json` |
| npm | `npm audit --json` |
| yarn | `yarn audit --json` |
| bun | (not yet supported — skip with note) |
| pip/pip3 | `pip-audit --format=json` (if pip-audit installed) |
| poetry | `poetry audit` (if available) or `pip-audit` |
| go | `govulncheck ./...` (if installed) |
| cargo | `cargo audit --json` (if cargo-audit installed) |

## 3b. Parse Audit Output

Parse the output for each vulnerability:

- Package name and installed version
- Vulnerability ID (CVE, GHSA, etc.)
- Severity (critical, high, moderate, low)
- Fixed version (if available)
- Description

## 3c. Cross-Reference with Banned Packages

Using the `banned-packages.json` data loaded in Step 1, cross-reference every installed package against the banned list for the project's ecosystem.

For each installed package found on the banned list, add it as a finding with:

- **Severity:** Use the banned entry's `severity` (critical, high, medium)
- **Reason:** The banned entry's `reason` field
- **Alternatives:** The banned entry's `alternatives` array
- **CVEs:** Any CVEs listed in the banned entry

Example: if `axios` is installed in a JS project, create a finding:

```
[BANNED] axios — critical — 9+ CVEs (SSRF, credential leakage, DoS). State-sponsored supply chain compromise 2026-03-31 injected RAT via hijacked maintainer account. Alternatives: native fetch(), ky, ofetch
```

This check catches packages that may not have active CVEs in the audit database but are banned for governance, maintenance, or supply-chain reasons.

## 3d. Enrich Critical and High CVEs with WebFetch

For each Critical or High CVE from the audit, use WebFetch to pull additional context:

- `https://github.com/advisories/{GHSA-ID}` for GitHub Advisory details
- Or `https://www.cve.org/CVERecord?id={CVE-ID}` for CVE database

Extract:
- Exploit status (known exploited?)
- Patch availability
- Affected version ranges
- CVSS score

Include this context in the finding so the fix is actionable, not just an ID.

## 3e. Store Findings

Store all dependency findings (audit results + banned packages) for use in Steps 4 (exposure analysis) and 5 (severity mapping).

---

**Next:** Read `steps/04-exposure-analysis.md`
