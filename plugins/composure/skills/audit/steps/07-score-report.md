# Step 7: Score, Report, and Persist

Calculate letter grades, write the plan file, create TaskCreate entries, and output the report.

## 7a. Calculate letter grades

Use findings from Steps 1-6 to assign grades:

| Category | A | B | C | D | F |
|----------|---|---|---|---|---|
| **Architecture** | 0 cycles, 0 high fan-out, 0 dead exports | 1 cycle OR 1-2 fan-out | 2-3 cycles OR 3-5 fan-out | 4+ cycles | 5+ cycles + 10+ dead exports |
| **Security** | 0 CVEs, 0 suppressions, 0 secrets | 0 CVEs, <5 suppressions | Low CVEs, <10 suppressions | High CVEs | Critical CVEs + secrets found |
| **Code Quality** | 0 files >400, 0 TODOs, 0 ghosts | 1-3 files >400, <5 TODOs | 4-8 files >400, <15 TODOs | 8+ files >400 | Critical files + ghosts |
| **Dependencies** | 0 CVEs, all current | 0 CVEs, <5 outdated | Low CVEs, 1+ major behind | High CVEs | Critical CVEs + major gaps |
| **Test Coverage** | >80% tested | 60-80% | 40-60% | 20-40% | <20% |

If `--quick` was used, mark skipped categories:
- Security: "N/A — run `/sentinel:scan` or full audit"
- Code Quality: "N/A — run full audit"
- Dependencies: "N/A — run `/shipyard:deps-check` or full audit"
- Test Coverage: "N/A — run full audit"
- Architecture: Grade normally if graph was available; "N/A" if graph was also unavailable

If `run_audit` from Step 0 returned grades, merge them: use the LOWER grade between graph audit and our extended checks (conservative).

## 7b. Write plan file (MANDATORY)

Create `tasks-plans/audits/health-{YYYY-MM-DD}.md`:

```markdown
# Codebase Health Report — {project-name}
# {date}

## Scorecard

| Category | Grade | Summary |
|----------|-------|---------|
| Architecture | {grade} | {summary} |
| Security | {grade} | {summary} |
| Code Quality | {grade} | {summary} |
| Dependencies | {grade} | {summary} |
| Test Coverage | {grade} | {summary} |

Overall: **{weighted average}**

## File Size Distribution

| Range | Files | % |
|-------|-------|---|
| <50 lines | {n} | {pct}% |
| 50-100 | {n} | {pct}% |
| 100-200 | {n} | {pct}% |
| 200-400 | {n} | {pct}% |
| 400-600 ⚠️ | {n} | {pct}% |
| 600+ 🔴 | {n} | {pct}% |

## Architecture
{circular deps, fan-out, dead exports, mixed concerns, barrel bloat — or "Skipped (--quick)"}

## Security
### Suppression Census
{total count, breakdown by type, top 5 hotspot files}

### Dependency CVEs
{audit output or "0 vulnerabilities ✅"}

### Hardcoded Secrets
{findings or "None detected ✅"}

## Code Quality
### Size Violations
{table of files exceeding thresholds}

### Ghost Duplicates
{ghost findings or "None detected ✅"}

### TODO Census
{total, top 5 files}

## Dependencies
{outdated count, framework version status, monorepo mismatches}

## Test Coverage
{percentage, top 10 untested files by import count}

## Priority Remediation
- [ ] 1. {highest impact — e.g., fix circular deps}
- [ ] 2. {second — e.g., resolve suppressions in auth module}
- [ ] 3. {third — e.g., decompose 3 files over 600 lines}
- [ ] 4. ...

## Execution Order
{based on blast radius, churn frequency, and coupling — per Step 6 of old format}
```

## 7c. Create TaskCreate entries (Critical + High only)

```
Priority mapping:
  🔴 Critical → TaskCreate with metadata: { priority: "critical", audit: "health-{date}" }
  ��� High → TaskCreate with metadata: { priority: "high", audit: "health-{date}" }
  🟢 Moderate → Plan file only (too noisy for TaskCreate)
```

Each TaskCreate includes:
- **subject**: Short imperative — "Fix circular dep: auth.ts ↔ session.ts"
- **description**: File paths, current state, recommended fix
- **activeForm**: "Auditing {project-name}"

## 7d. Output report to conversation

Print the scorecard and top findings to the user. Keep it scannable:

```
Codebase Health: {project-name}

  Architecture:  {grade} — {1-line summary}
  Security:      {grade} — {1-line summary}
  Code Quality:  {grade} — {1-line summary}
  Dependencies:  {grade} — {1-line summary}
  Test Coverage: {grade} — {1-line summary}

  Overall: {grade}

  Top 5 priority fixes:
  1. ...
  2. ...

  Full report: tasks-plans/audits/health-{date}.md
  HTML report: call generate_audit_html() to create a shareable visual report
```

## 7e. Suggest execution order

After the report, rank remediation items by:
1. **Blast radius** — items imported by many files should be fixed first (use `importers_of` if graph available)
2. **Churn frequency** — files changed often (`git log --oneline FILE | wc -l`)
3. **Coupling** — fix circular deps before decomposing individual files
4. **Quick wins** — dead exports and suppressions are fast to clean up

## 7f. Auto-Blueprint for Complex Remediation

If the audit produced remediation items complex enough to warrant a persistent plan, automatically generate a blueprint instead of just listing suggestions.

**Threshold** — use the graph to assess complexity, not just file count:
- **<10 files, no cross-module dependencies**: just list the remediation items. Routine work.
- **10-15 files OR imports cascade across 3+ directories**: offer to blueprint. "This touches N files across M directories. Want me to blueprint it?"
- **15+ files OR 10+ import path changes**: auto-blueprint. Too many operations to hold in your head — the plan needs to persist.
- **Always check blast radius**: if `get_impact_radius` shows a high-importer file is affected (10+ importers), that alone justifies a blueprint regardless of file count.

**What to pass to blueprint**: The remediation items, affected files, and execution order from 7e. The blueprint's graph scan (Step 2) will enrich this with blast radius and dependency context.

**If below threshold** (<5 files): just list the remediation items and let the user decide. Don't force a blueprint for quick fixes.

## 7g. Handoff — Suggest next steps

If auto-blueprint was triggered, say:
> "Audit found structural issues affecting N files. Generating a blueprint for the remediation..."

Then proceed with the blueprint skill.

If auto-blueprint was NOT triggered, guide the user:

| If the audit found... | Suggest |
|---|---|
| Structural issues (misplaced files, naming violations, mixed concerns) | "`/composure:code-organizer` — restructure file layout to match framework conventions" |
| Critical or High priority tasks | "`/composure:backlog batch` — process tasks sequentially, or `delegate` for parallel" |
| Security findings (CVEs, suppressions, hardcoded secrets) | "`/sentinel:scan` — deep security analysis with OWASP rulesets" |
| Outdated dependencies | "`/shipyard:deps-check` — safe upgrade recommendations with CVE blocking" |
| Low test coverage | "`/testbench:generate` — generate tests for uncovered files" |
| Clean report (all A/B grades) | "Codebase is healthy. Use `/composure:blueprint` to plan your next feature." |

Always suggest: "Full report: `tasks-plans/audits/health-{date}.md`"

---

**Done.** Audit complete.
