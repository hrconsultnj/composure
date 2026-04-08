---
name: product-planner
description: Map user types, goals, flows, screens before coding.
argument-hint: "[description of the app idea, or empty for interactive intake]"
---

The business-analyst phase for greenfield app development. Maps personas, journeys, screens, and features BEFORE any code is written.

This skill fills the gap between "I have an app idea" and "here's the blueprint." It produces a structured journey document that feeds directly into `composure:blueprint`'s greenfield mode as Phase 00.

> **Currently open for beta** — licensing for this feature is being finalized. Full access while in beta.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill design-forge product-planner {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | Purpose |
|---|------|---------|
| 00 | `00-license-check.md` | Beta access check |
| 01 | `01-intake.md` | Parse description, identify user types + goals |
| 02 | `02-persona-mapping.md` | Generate personas with pain points + device prefs |
| 03 | `03-journey-flows.md` | Map flows per persona (happy path, edge, error) |
| 04 | `04-screen-inventory.md` | Extract + deduplicate screens from flows |
| 05 | `05-feature-extraction.md` | Bridge from UX to code: features, entities, endpoints |
| 06 | `06-write-journey-doc.md` | Write consolidated journey document |

## Output

A structured `user-journey.md` document containing:
1. Personas (name, role, goals, pain points, devices)
2. Journey flows (Mermaid diagrams + prose)
3. Screen inventory (name, purpose, personas, navigation)
4. Feature list (name, screens, data entities, API endpoints, dependencies)

This output is implementation-agnostic — it doesn't prescribe any framework. It feeds into `composure:blueprint` for stack selection and architecture decisions.
