# Step 4: Auto-Fix, Report, and Task Queue

## Auto-Fix (if --fix passed)

If `--fix` is requested, auto-upgrade packages that meet ALL of these criteria:

1. The upgrade is patch or minor (NOT a major version bump)
2. The highest safe version is known
3. The package is a direct dependency (not transitive-only)

Execute the upgrade:

```bash
# pnpm
pnpm update {package}@{highestSafe}

# npm
npm install {package}@{highestSafe}

# yarn
yarn upgrade {package}@{highestSafe}
```

After upgrading, **re-audit** to verify the fix:

```bash
pnpm audit --json 2>/dev/null
```

If the re-audit shows new vulnerabilities introduced by the upgrade:

1. Roll back the upgrade: `git checkout -- package.json pnpm-lock.yaml`
2. Report: "Upgrade of {package} to {version} introduced new vulnerability {CVE}. Rolled back."

If `--fix` is not passed but vulnerabilities are found, show the exact fix commands:

```
Fix commands (copy-paste ready):
  pnpm update example-lib@2.4.2
  pnpm update another-pkg@1.5.8
```

## Write Critical/High CVEs to Task Queue

For each Critical or High severity vulnerability, write an entry to `tasks-plans/tasks.md`:

```markdown
- [ ] **[CVE-2024-48930]** example-lib@2.3.1 -- Prototype pollution in deep merge. Fix: upgrade to example-lib@2.4.2. Run: `pnpm update example-lib@2.4.2`
- [ ] **[GHSA-xxxx-yyyy]** another-pkg@1.2.0 -- ReDoS in URL parser. Fix: upgrade to another-pkg@1.5.8. Run: `pnpm update another-pkg@1.5.8`
```

These entries integrate with Composure's `/commit` gate:
- The commit skill reads `tasks-plans/tasks.md` for open tasks
- Open Critical/High tasks on staged files block commits
- Tasks are auto-cleaned when marked `[x]` (resolved)

The `**[CVE-...]**` prefix makes these entries grep-able and distinguishes them from code quality tasks (`**[DECOMPOSE]**`) and CI tasks (`**[CI]**`).

## Report

**Standard output:**

```
Dependency Audit: <project-name>

Package manager: pnpm
Packages scanned: 847
Vulnerable: 3
Up-to-date: 844

Critical (1):
  example-lib@2.3.1
    CVE-2024-48930 -- Prototype pollution in deep merge
    Vulnerable: <2.3.5
    Highest safe: 2.4.2 (patch bump)
    Fix: pnpm update example-lib@2.4.2
    Advisory: https://github.com/advisories/GHSA-xxxx-yyyy

High (1):
  another-pkg@1.2.0
    GHSA-xxxx-yyyy -- ReDoS in URL parser
    Vulnerable: <1.5.0
    Highest safe: 1.5.8 (minor bump)
    Fix: pnpm update another-pkg@1.5.8

Medium (1):
  some-dep@3.0.0
    CVE-2024-55555 -- Information disclosure via timing attack
    Vulnerable: <3.0.3
    Highest safe: 3.0.3 (patch bump)
    Fix: pnpm update some-dep@3.0.3

Summary: 1 critical, 1 high, 1 medium
  Written to tasks-plans/tasks.md: 2 tasks (critical + high)
  Fix all: pnpm update example-lib@2.4.2 another-pkg@1.5.8 some-dep@3.0.3
```

**JSON output (--json):**

```json
{
  "packageManager": "pnpm",
  "packagesScanned": 847,
  "vulnerable": 3,
  "findings": [
    {
      "package": "example-lib",
      "current": "2.3.1",
      "severity": "critical",
      "cve": "CVE-2024-48930",
      "title": "Prototype pollution in deep merge",
      "vulnerableRange": "<2.3.5",
      "firstPatched": "2.3.5",
      "highestSafe": "2.4.2",
      "upgradeType": "patch",
      "fixCommand": "pnpm update example-lib@2.4.2",
      "advisory": "https://github.com/advisories/GHSA-xxxx-yyyy"
    }
  ],
  "fixAllCommand": "pnpm update example-lib@2.4.2 another-pkg@1.5.8 some-dep@3.0.3"
}
```

---

**Done.**
