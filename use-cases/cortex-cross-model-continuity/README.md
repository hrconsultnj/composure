# Cross-Model Continuity — Start with Opus, Finish with Sonnet

**Scenario**: Developer starts architecture analysis with Opus (expensive, deep), switches to Sonnet for implementation (fast, cheap), reviews with Opus again — same context throughout
**Stack**: Next.js 16, Supabase, multi-tenant SaaS
**Organism layer**: Brain (Cortex — thinking sessions + memory graph)

---

## The Problem

AI models have different strengths and costs. Opus thinks deeply but costs $15/M tokens. Sonnet codes fast at $3/M tokens. Haiku scaffolds at $0.80/M tokens.

Today, switching models means starting from zero. The Sonnet session doesn't know what Opus decided. The Opus review doesn't know what Sonnet implemented. Developers manually copy-paste context between sessions — losing nuance, decisions, and reasoning trails.

The result: teams either overspend (Opus for everything) or lose quality (Sonnet without context).

---

## What Happens With Cortex

### Phase 1: Opus Architecture Session (15 minutes, ~$4)

The developer asks Opus to analyze the payment system architecture.

Opus creates a thinking session (`sequential_think`):
```
Session: "Payment system architecture review"

Thought 1: The current payment handler processes Stripe webhooks synchronously.
           Under load (>100 concurrent webhooks), the handler times out because
           each webhook blocks while writing to the database.

Thought 2: Three approaches:
           A) Queue-based (SQS/Redis) — async processing, retry built-in
           B) Batch writes — accumulate events, bulk insert every 5 seconds  
           C) Connection pooling — increase DB connections, keep sync model

Thought 3 (branch: "queue-approach"): Queue is the right call. Batch writes
           lose individual event tracking. Connection pooling just delays the
           problem. Queue gives: retry, dead letter, backpressure, observability.

Thought 4: Implementation plan:
           - Add Bull queue with Redis
           - Webhook handler enqueues, returns 200 immediately
           - Worker processes events with retry logic
           - Dead letter queue for failed events after 3 retries

Conclusion: Queue-based architecture with Bull + Redis. Estimated: 6 files, 
           ~400 lines. Idempotency via Stripe event ID deduplication.
```

Opus also creates memory nodes:
- "Payment webhook handler has timeout issue under 100+ concurrent events"
- "Chose queue-based over batch writes because of individual event tracking need"
- "Stripe idempotency key pattern: use event ID as dedup key in Redis"

### Phase 2: Sonnet Implementation Session (20 minutes, ~$2)

Developer switches to Sonnet. Opens the same project.

SessionStart hook fires → Cortex loads recent context:
```
Previous session context available:
- Thinking session: "Payment system architecture review" (completed, 4 thoughts)
- 3 memory nodes from last 2 hours (payment architecture decisions)

Loading context...

Opus concluded: Queue-based architecture with Bull + Redis for payment webhooks.
Implementation plan: 6 files, ~400 lines. Idempotency via Stripe event ID.
```

Sonnet doesn't need to re-analyze the architecture. It reads the thinking session, understands the WHY (thought 3's branch explains the tradeoff), and starts implementing:
- `src/queues/payment-webhook.queue.ts` — Bull queue definition
- `src/workers/payment-webhook.worker.ts` — Event processor with retry
- `src/api/webhooks/stripe.ts` — Modified to enqueue instead of process
- `lib/redis.ts` — Redis client singleton
- `lib/stripe/dedup.ts` — Event ID deduplication check
- Tests for all of the above

Sonnet adds its own memory nodes:
- "Bull queue config: 3 retries, exponential backoff (1s, 4s, 16s)"
- "Dead letter queue events stored in `payment_dead_letter` table"
- "Redis connection uses COMPOSURE_REDIS_URL env var"

### Phase 3: Opus Review Session (10 minutes, ~$3)

Developer switches back to Opus for review.

SessionStart hook fires → Cortex loads ALL context:
```
Two previous sessions:
- Architecture analysis (Opus, completed)
- Implementation (Sonnet, completed)
- 6 memory nodes spanning both sessions

Loading context...
```

Opus reviews with FULL history:
- Reads the architecture thinking session (its own reasoning)
- Reads the implementation memory nodes (what Sonnet decided)
- Reviews the code against the original design
- Catches: "Sonnet used a fixed 3-retry limit but the architecture session discussed configurable retry counts. Should be configurable."
- Approves the rest

---

## The Numbers

| Metric | Without Cortex | With Cortex |
|---|---|---|
| **Total cost** | ~$12 (all Opus) | ~$9 (Opus + Sonnet + Opus) |
| **Context lost between sessions** | 100% (manual copy-paste) | 0% (automatic) |
| **Time spent on context recovery** | ~10 min per switch | 0 min (SessionStart loads) |
| **Decision traceability** | None | Full thinking session + memory trail |
| **Review quality** | Opus re-derives conclusions | Opus reviews against its own analysis |

### Cost Breakdown

```
Without Cortex (Opus for everything):
  Architecture:    15 min, ~$4
  Implementation:  20 min, ~$6  (Opus is slower at routine coding)
  Review:          10 min, ~$3
  Context recovery: 10 min, ~$1 (re-reading, re-explaining)
  TOTAL:           55 min, ~$14

With Cortex (model switching):
  Architecture:    15 min, ~$4  (Opus — deep analysis)
  Implementation:  20 min, ~$2  (Sonnet — fast coding, 5x cheaper)
  Review:          10 min, ~$3  (Opus — deep review)
  Context recovery:  0 min, ~$0  (Cortex handles it)
  TOTAL:           45 min, ~$9
```

**35% cost reduction. 18% time reduction. Zero context loss.**

---

## How It Works

```
┌──────────────┐     ┌──────────────────────────┐     ┌──────────────┐
│  Opus        │     │  Cortex Memory + Thinking │     │  Sonnet      │
│  (Session 1) │────►│                          │────►│  (Session 2) │
│              │     │  Thinking session:       │     │              │
│  Analyzes    │     │  "Payment architecture"  │     │  Implements  │
│  Decides     │     │                          │     │  Codes       │
│  Records     │     │  Memory nodes:           │     │  Records     │
└──────────────┘     │  "Chose queue-based..."  │     └──────┬───────┘
                     │  "Idempotency via..."    │            │
┌──────────────┐     │  "Bull queue config..."  │            │
│  Opus        │     │  "Dead letter table..."  │            │
│  (Session 3) │◄────│                          │◄───────────┘
│              │     └──────────────────────────┘
│  Reviews     │
│  Against own │
│  analysis    │
└──────────────┘
```

The thinking session is the CONTINUITY THREAD. It doesn't matter which model reads it — the reasoning chain is model-agnostic.

---

## Why This Only Works With Cortex

- **MCP Memory** (flat JSON): Can store key-value pairs but no thinking chains, no graph traversal, no semantic search. You'd get "payment handler uses queue" but not WHY.
- **Claude's built-in memory**: Per-project, per-model. Opus's memory doesn't transfer to Sonnet.
- **Manual notes**: Developers write "switch notes" but lose nuance. "Use queue" doesn't capture "we considered batch writes but rejected them because of individual event tracking."
- **Cortex**: Full thinking sessions with branches and revisions. Memory graph with relationships. Semantic search across all context. Model-agnostic persistence. 4-door transport (works on CLI, Desktop, Web, any MCP client).
