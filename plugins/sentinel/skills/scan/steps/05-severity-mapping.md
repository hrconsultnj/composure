# Step 5: Severity Mapping

Map each finding to a priority level using a two-axis model: **Severity** (from the scanner) x **Exposure** (from the graph).

## 5a. Source Severity Normalization

First, normalize scanner severities to a common scale:

| Source Severity | Normalized |
|----------------|-----------|
| Semgrep ERROR | Critical |
| Semgrep WARNING | High |
| Semgrep INFO | Moderate |
| CVE Critical | Critical |
| CVE High | High |
| CVE Moderate | Moderate |
| CVE Low | (omit — not actionable enough) |
| Banned package critical | Critical |
| Banned package high | High |
| Banned package medium | Moderate |

## 5b. Two-Axis Priority Matrix

Cross-reference normalized severity with exposure to produce a priority:

| | Public | Authenticated | Internal | Dead Code |
|---|---|---|---|---|
| **Critical** | P0 | P1 | P2 | P3 |
| **High** | P1 | P2 | P3 | Ignore |
| **Moderate** | P2 | P3 | Ignore | Ignore |

## 5c. Priority Definitions

Map priorities to Composure task queue severity levels:

| Priority | Composure Severity | Action |
|----------|-------------------|--------|
| P0 | Critical | Fix immediately |
| P1 | High | Fix this sprint |
| P2 | Moderate | Schedule fix |
| P3 | Low | Backlog / remove dead code |
| Ignore | — | Omit from task queue |

## 5d. Application

Tag each finding with its computed priority (P0, P1, P2, P3, or Ignore). Findings marked Ignore will be excluded from the task queue in Step 7 and the report in Step 8.

Examples:
- SQL Injection (Critical severity) in a public API route (Public exposure) => **P0**
- Hardcoded secret (High severity) in an authenticated route (Authenticated exposure) => **P2**
- Deprecated package (Moderate severity) used only in scripts (Internal exposure) => **Ignore**
- Critical CVE in a package with zero importers (Dead Code exposure) => **P3**

---

**Next:** Read `steps/06-known-cve-check.md`
