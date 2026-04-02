# Step 1: Load Config

Read `.claude/testbench.json` for conventions.

```bash
cat .claude/testbench.json 2>/dev/null
```

If the config does not exist, run `/testbench:calibrate` first. Do NOT proceed without conventions -- convention-blind test generation produces generic tests that don't match the project and get deleted.

---

**Next:** Read `steps/02-analyze-source.md`
