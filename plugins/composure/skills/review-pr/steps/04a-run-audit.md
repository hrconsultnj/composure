# Step 4a: Run the Audit

Execute the full quality audit:

```
run_audit({ include_security: false, include_testing: true })
```

Read the response. It contains:
- `findings` — array of quality issues (oversized files, oversized functions, untested code)
- `scores` — letter grades per category (size, testing, cohesion)
- `summary` — aggregate statistics

Write down the total finding count and overall grade before proceeding. You will need these numbers in step 08.

---

**Next:** Read `04b-filter-changed.md`
