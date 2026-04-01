---
name: integration-builder
description: Stack-agnostic third-party integration scaffolding. Detects project language, pulls latest SDK docs via Context7, chooses integration tier, scaffolds client/auth/webhooks with proper error handling and test patterns. Works across TypeScript, Python, Go, Rust, and Ruby.
argument-hint: "[service-name] [--skip-docs] [--quick]"
---

# Integration Builder

Guided workflow for adding third-party service integrations. Detects your project's language and framework, discovers the official SDK, pulls current documentation via Context7, and scaffolds a complete integration with auth, webhooks, error handling, and tests.

**Not a code generator** -- this skill guides Claude through the integration process using stack-agnostic patterns (Hexagonal Architecture: Ports & Adapters) combined with language-specific best practices from live documentation.

## When to Use

- "Add Stripe integration"
- "Create API client for Twilio"
- "Set up webhooks for GitHub"
- "Integrate with SendGrid for email"
- "Connect to the Shopify API"
- Any third-party service connection, SDK setup, or API client creation

## Arguments

- `--skip-docs` -- Skip Context7 documentation pull (use when offline or Context7 unavailable)
- `--quick` -- Abbreviated mode: identify + decide + scaffold only (skip detailed implementation and test guidance)

## Workflow

**Read each step file in order. Do NOT skip steps. Each step ends with "Next: read step X."**

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-identify.md` | Identify target service, detect project stack, check monorepo |
| 2 | `steps/02-discover.md` | Find official SDK, pull Context7 docs for latest API surface |
| 3 | `steps/03-decide.md` | Choose integration tier, confirm auth strategy with user |
| 4 | `steps/04-scaffold.md` | Create directory structure (monorepo-aware, language-appropriate) |
| 5 | `steps/05-implement.md` | Generate client, auth, webhooks following Hexagonal patterns |
| 6 | `steps/06-test.md` | Generate test scaffolding (MSW/Pact for TS, language-appropriate for others) |

**Start by reading:** `steps/01-identify.md`

## Key Constraints

- **Never install an SDK for the wrong language** -- Always detect project stack before suggesting packages
- **Always pull latest docs** -- Context7 for current API surface, not stale bundled references
- **Detect monorepo before scaffolding** -- Workspaces get `packages/integrations/{service}/`, single repos get `src/lib/integrations/{service}/`
- **Hexagonal Architecture** -- Integration port (interface) is stack-agnostic, adapter (implementation) is language-specific

## Relationship to Blueprint

When `/composure:blueprint` classifies work as `integration`, it loads this skill's reference docs in step 4a. The blueprint will include integration-specific sections (auth strategy, webhook setup, SDK tier decision).

For quick integrations that don't need full blueprint planning, invoke directly: `/composure:integration-builder stripe`

## Reference Docs (loaded on demand by steps)

| Reference | Used by step | Contents |
|-----------|-------------|----------|
| `references/integration-tiers.md` | Step 3 | 5-tier decision matrix (Direct API, Official SDK, Unified API, MCP Gateway, OpenAPI SDK Gen) |
| `references/auth-patterns.md` | Step 5 | OAuth 2.0, API key, Bearer token, Basic Auth flows |
| `references/webhook-patterns.md` | Step 5 | Signature verification, idempotency, event routing |
| `references/error-handling.md` | Step 5 | IntegrationError, retry with backoff, circuit breaker |
| `references/testing-patterns.md` | Step 6 | MSW + Pact (TS), pytest (Python), Go test, per-language strategies |
| `references/monorepo-patterns.md` | Step 4 | Workspace detection, packages/ structure, cross-app consumption |
