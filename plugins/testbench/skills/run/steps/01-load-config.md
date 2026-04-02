# Step 1: Load Config

Read `.claude/testbench.json` for run commands and framework info.

```bash
cat .claude/testbench.json 2>/dev/null
```

If the config does not exist:

```
Testbench not calibrated. Run /testbench:calibrate first.
```

Stop here. Do NOT guess run commands -- the wrong command wastes time and produces confusing output.

---

**Next:** Read `steps/02-determine-scope.md`
