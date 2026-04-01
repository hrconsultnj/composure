# Step 4e: Build the Quality Summary

Assemble the metrics from steps 4a-4d into a structured summary. Steps 05 (deep-dive) and 08 (output) will reference this directly.

```
QUALITY_GRADE: <letter grade for changed files>
OVERSIZED_FUNCTIONS: <count> functions exceed 100-line threshold
  - <function_name> in <file> (<line_count> lines) [regression | pre-existing]
UNTESTED_FUNCTIONS: <count> changed functions without tests
  - <function_name> in <file> [new | modified]
OVERSIZED_FILES: <count> files exceed threshold
  - <file> (<line_count> lines) [PR increased | pre-existing]
REGRESSIONS: <count> new quality violations introduced by this PR
IMPROVEMENTS: <count> quality violations resolved by this PR
TEST_COVERAGE_RATIO: N/M changed functions have tests
QUALITY_DELTA: <net impact — regressions minus improvements>
```

Store this summary.

---

**Next:** Read `steps/05-deep-dive.md`
