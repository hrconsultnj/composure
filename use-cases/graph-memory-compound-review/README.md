# Compound Code Review — Graph Structure + Memory Context + Guardrails Compliance

**Scenario**: A PR modifies a payment handler that previously had a PII leak. The review catches the same pattern before it ships — again.
**Stack**: Next.js 16, Supabase, Stripe payments
**Organism layer**: Skeleton (Graph) + Brain (Memory) + Conscience (Guardrails)

---

## The Problem

Code reviews check WHAT changed. They don't check what HAPPENED BEFORE. A reviewer sees a clean diff and approves it — not knowing that the same file had a PII exposure last sprint that was fixed and then accidentally reintroduced.

Traditional tools:
- **Git blame**: Shows WHO changed a line, not WHY
- **PR comments**: Buried in closed PRs from months ago
- **Team memory**: The person who found the bug left the company

---

## What Happens With the Compound Review

Developer submits a PR modifying `src/api/webhooks/stripe-handler.ts`.

### Layer 1: Skeleton (Code Graph)

`/composure:review-pr` fires. The graph analyzes the diff:

```
Changed files: 1 (stripe-handler.ts)
Blast radius: 5 files import from this handler
Callers: processPaymentEvent() called by 2 queue workers
Tests: 3 test files cover this handler
```

Standard structural analysis. Every tool does this.

### Layer 2: Brain (Cortex Memory)

The review searches memory for context about this file:

```
Memory search: "stripe-handler.ts"

Results:
- [2026-03-15] "PII exposure in stripe-handler.ts — customer email was 
   included in webhook processing log. Fixed by adding PII masking before 
   any logging calls. See thinking session ATS_034."
  
- [2026-03-20] "Stripe handler was refactored to use Bull queue. Original 
   synchronous version timed out under 100+ concurrent webhooks."

- [2026-03-28] "Added idempotency deduplication using Stripe event ID. 
   Previous bug: duplicate webhook deliveries caused double charges."
```

The AI now knows: this file has a HISTORY. Specifically, it had a PII leak that was fixed by adding masking before logging.

### Layer 3: Conscience (AIGRaaS Guardrails)

The review evaluates the new code against the PCI compliance ruleset:

```
Scanning diff for compliance violations...

Line 47: logger.info(`Payment processed for ${customer.email}, amount: ${amount}`);

AIGRaaS evaluation:
  Phase 1: Hard Constraints → PASS
  Phase 2: Topic Classification → PASS (on-topic: payment processing)
  Phase 3: Principal → No conflict
  Phase 4: Harm Assessment → FLAG
    - PII in logging: customer.email exposed in log output
    - Severity: HIGH (PCI DSS violation)
    - Memory context: "This exact pattern was the root cause of the 
      PII exposure on 2026-03-15"
  Phase 5: Verdict → BLOCK (this is a REGRESSION of a known issue)
```

### The Compound Review Output

```
## PR Review: Modify stripe-handler.ts

### 🔴 BLOCKED — PII Regression Detected

Line 47 logs `customer.email` in plain text. This is the SAME PII exposure
that was fixed on 2026-03-15 (see thinking session ATS_034).

**Previous incident**: Customer email was included in webhook processing logs.
Fixed by adding PII masking before logging calls.

**This PR**: Reintroduces the same pattern in a new log statement.

**Fix**: Use the existing `maskPII()` utility:
```typescript
logger.info(`Payment processed for ${maskPII(customer.email)}, amount: ${amount}`);
```

### Structural Analysis (Graph)
- Blast radius: 5 dependent files (none need changes for this fix)
- Test coverage: 3 test files exist but none test PII masking in new log
- Recommendation: Add test case for PII masking in webhook logs

### Compliance (Guardrails)
- PCI DSS: FAIL — customer email in logs violates PCI requirements
- This is a flagged regression — same file, same pattern, previously fixed
```

---

## Why Each Layer Matters

| Layer | What it caught | What would have happened without it |
|---|---|---|
| **Graph** (Skeleton) | 5 files depend on the changed handler | Reviewer might not check downstream consumers |
| **Memory** (Brain) | This EXACT pattern caused a PII leak last month | Reviewer wouldn't know about the previous incident |
| **Guardrails** (Conscience) | PCI violation in log statement | Compliance violation ships to production |

One layer alone catches a PIECE of the problem:
- Graph alone: "5 files are affected" (no PII awareness)
- Memory alone: "This file had a PII issue before" (no specific line detection)
- Guardrails alone: "PII in log statement" (no history — just current violation)

All three together: "This is a REGRESSION of a KNOWN PII exposure in a file with 5 downstream dependents, and it violates PCI compliance."

That's the compound review. Structure + History + Ethics. Three knowledge systems, one verdict.

---

## The Numbers

| Metric | Standard review | Compound review |
|---|---|---|
| **PII regression caught** | 20% (depends on reviewer's memory) | 100% (Memory has the history) |
| **Compliance violations caught** | 40% (manual checklist) | 100% (automated PCI evaluation) |
| **Time to review** | 15-20 min (read code, check context manually) | 3-5 min (context pre-loaded) |
| **Downstream impact identified** | Sometimes (reviewer may check imports) | Always (graph traces all callers) |
