# Step 1: Load Configuration

Read stack from Composure config:

```bash
cat .claude/no-bandaids.json 2>/dev/null
```

Read security config from Sentinel (if installed):

```bash
cat .claude/sentinel.json 2>/dev/null
```

Read deployment config from Shipyard:

```bash
cat .claude/shipyard.json 2>/dev/null
```

If none exist, detect the framework manually from `package.json`.

---

**Next:** Read `steps/02a-environment-health.md`
