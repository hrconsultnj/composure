# Backend Architecture — Index

> **This is a barrel index.** Read this file first, then load the files listed below based on the detected stack.

## Always Load

| File | Contains |
|------|----------|
| [core.md](core.md) | Phases 1-2: Database schema, RLS policies, auth model, entity registry, ID prefixes |

## Load by `backend` value

| `backend` value | Also load |
|---|---|
| Any Supabase project | `references/private/` (RLS templates, migration checklist, role hierarchy) |

## Reference Docs (private submodule)

These contain full implementation templates. If the submodule isn't initialized, `core.md` provides enough conceptual guidance.

| Pattern | Reference |
|---------|-----------|
| Entity Registry | `references/private/data-patterns/01-entity-registry-feed.md` |
| ID Prefixes | `references/private/data-patterns/02-id-prefix-convention.md` |
| 4-Level Auth | `references/private/data-patterns/03-four-level-auth.md` |
| Privacy Groups | `references/private/data-patterns/04-privacy-role-system.md` |
| Contact-First | `references/private/data-patterns/05-contact-first-pattern.md` |
| Metadata Templates | `references/private/data-patterns/08-metadata-templates.md` |
| RLS Patterns | `references/private/rls-policies/rls-patterns.md` |
| Role Hierarchy | `references/private/rls-policies/role-hierarchy.md` |
| Migration Checklist | `references/private/rls-policies/migration-checklist.md` |
