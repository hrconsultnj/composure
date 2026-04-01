# Step 4: Quality Audit

Run the Composure quality audit to get objective, measurable findings. This provides FACTS ("function is 147 lines") rather than OPINIONS ("function seems long").

**Read each sub-step file in order. Do NOT skip ahead.**

| Sub-step | File | What it does |
|----------|------|-------------|
| 4a | `04a-run-audit.md` | Execute `run_audit`, capture raw results |
| 4b | `04b-filter-changed.md` | Filter findings to only files in the PR diff |
| 4c | `04c-classify-findings.md` | Classify each finding: regression, pre-existing, or improvement |
| 4d | `04d-test-coverage.md` | Extract test coverage gaps for changed/new functions |
| 4e | `04e-quality-delta.md` | Compute net quality impact of the PR |

**Start by reading:** `04a-run-audit.md`
