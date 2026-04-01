# Step 1: Load Config

Read `.claude/testbench.json` for conventions.

```bash
cat .claude/testbench.json 2>/dev/null
```

If the config exists, use it and proceed to step 2.

If the config does **not** exist, do NOT hard-stop. Instead:

1. Note that no config was found.
2. Proceed directly to step 2 (analyze source) and step 3 (read existing tests). Step 3 will extract concrete conventions from real test files -- this is sufficient to generate style-matched tests.
3. If the project has **no existing test files either**, then suggest running `/testbench:initialize` and stop. Convention-blind test generation on a blank project produces generic tests that get deleted.

The goal is resilience: a missing config should degrade gracefully, not block entirely.

---

**Next:** Read `steps/02-analyze-source.md`
