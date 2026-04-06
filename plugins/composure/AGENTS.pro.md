# Composure Pro Agent Patterns (Pro-tier overlay)

> **Loaded only when** `.composure/composure-pro.json` is present with a valid license. Free-tier users never see this content. These patterns assume the user has Composure Pro + the licensed Supabase multi-tenant architecture.

## Supabase multi-tenant discipline (Pro only)

- Respect the `feed` field and `!inner()` patterns for tenant isolation.
- Never bypass RLS policies.
- Trust the database boundary; don't reimplement isolation in application code.
- Use `supabase db push` for migrations (non-destructive). NEVER run bare `supabase db reset`.
- Multi-tenant query pattern: every user-data query MUST use `!inner(feed.account_id.eq.<current>)` to ensure tenant isolation. Without the `!inner()`, the query bypasses RLS.

## ID Prefix System (Pro only)

Composure Pro uses a consistent ID prefix system for entities: 3-letter uppercase prefix + timestamp-derived suffix. Example: `USR`, `MSG`, `INV`.

- When creating new entity types, pick a prefix that doesn't collide with existing ones (check `data-patterns/id-prefixes.json`).
- When querying by ID, you can filter by prefix to narrow the search space.
- Never generate IDs manually — use the `generate_id_prefix` database trigger.

## Type Generation Pipeline (Pro only)

- Run `supabase gen types typescript` after every schema change.
- Generated types land at `src/lib/supabase/database.types.ts`.
- Use `2>/dev/null` to suppress CLI noise.
- Domain types live in `src/types/` (hand-written); DB-generated types stay at the Supabase adapter layer.

## Entity Registry Feed (Pro only)

- All entity tables feed into a central `entity_registry` table via a `create_entity_feed()` trigger.
- Feature migrations MUST NOT replace `create_entity_feed()` or `generate_entity_id_prefix()`. These live only in the foundation migration.
- When adding a new entity type, extend the foundation trigger separately — not in the feature migration.
