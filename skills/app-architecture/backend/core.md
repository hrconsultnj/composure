# Backend Core — Database & Auth Architecture

## Phase 1: Database Schema

### Every Table Needs:

1. **ID Prefix Trigger** — Human-readable prefixes (not bare UUIDs)
2. **Feed Field** — Links to entity registry for tenant isolation
3. **RLS Policies** — Row-level security with proper join patterns
4. **Indexes** — On tenant isolation fields and common query fields

> Migration templates, trigger functions, and RLS policy examples are available in the private references. See [01-entity-registry-feed.md](../references/private/data-patterns/01-entity-registry-feed.md), [02-id-prefix-convention.md](../references/private/data-patterns/02-id-prefix-convention.md), and the [RLS policies directory](../references/private/rls-policies/).

---

## Phase 2: Auth & Role Model

### Multi-Level Auth

Design your auth with layered access control:
1. **User exists** — authenticated identity
2. **Role assigned** — what the user can do
3. **Privacy group** — what data scope the role grants
4. **Account link** — how the user connects to tenant data (directly or via contact records)

> Implementation details for auth levels, privacy group tables, and account linking methods are in the private references. See [03-four-level-auth.md](../references/private/data-patterns/03-four-level-auth.md) and [04-privacy-role-system.md](../references/private/data-patterns/04-privacy-role-system.md).

---

## Anti-Patterns

### ❌ Database
- Missing human-readable ID prefixes on tables
- No tenant isolation field linking resources to accounts
- RLS policies that don't enforce tenant boundaries on joins
- Hardcoded UUIDs instead of querying lookup tables

### ❌ Multi-Tenant
- Missing `!inner()` on joins that need RLS filtering
- No feed field linking resources to entity registry
- Account data leaking across tenants due to missing RLS

---

## Checklist

### Database Layer
- [ ] Migration with human-readable ID prefixes
- [ ] Tenant isolation field linking resources to accounts
- [ ] RLS policy enforcing tenant boundaries
- [ ] Indexes on isolation fields and common query columns
