---
name: ux-researcher
description: AI-powered design research agent that uses web search to discover design patterns, analyze competitors, research industry trends, evaluate modern web technologies, and create actionable reports for design-forge implementation. Automates the intelligence gathering phase of design work.
---

# UX Researcher (AI Design Intelligence)

AI-powered design research agent that autonomously gathers intelligence through web search to inform design decisions. Does the groundwork research that feeds into the design-forge skill, discovering patterns, technologies, and approaches that work in the real world.

**Not for manual user research** -- this is an AI research agent that uses WebSearch and WebFetch to analyze existing products, discover patterns, and create actionable design intelligence reports.

## When to Use

- "Research design patterns for [feature type]"
- "What are modern approaches to [UI pattern]?"
- "Analyze competitors for [product category]"
- "Should we use [technology] for [use case]?"
- "Research industry standards for [domain]"
- "Find examples of [design pattern] in production"

## Workflow

**Read each step file in order. Do NOT skip steps. Each step ends with "Next: read step X."**

| Step | File | What it does |
|------|------|-------------|
| 1 | `steps/01-define-scope.md` | Research scope, user questions, research type classification |
| 2 | `steps/02-execute-research.md` | WebSearch/WebFetch strategy, competitor analysis, pattern discovery, tech evaluation |
| 3 | `steps/03-synthesize.md` | Pattern grouping, comparison matrices, finding consolidation |
| 4 | `steps/04-write-report.md` | Report structure, MANDATORY file output, format rules |
| 5 | `steps/05-handoff.md` | Summary to conversation, hand off to design-forge |

**Start by reading:** `steps/01-define-scope.md`

## Output Rules (MANDATORY)

**ALWAYS write research to a file.** Never output full research reports into the conversation.

1. Write the full report to `.claude/research/{topic}-{YYYY-MM-DD}.md`
2. Create `.claude/research/` directory if it doesn't exist
3. In the conversation, output ONLY: 3-5 line summary, key tech choice, path to report, "Read the report and run `/design-forge` to implement"

**Why:** Research reports are 200-500 lines. Dumping them into the conversation wastes context tokens. A file persists, can be re-read by `/design-forge`, and survives across sessions.

## Relationship to design-forge

This skill is the **research phase** of the design-forge workflow:

```
ux-researcher (research) --> design-forge (implement)
```

Both skills ship in the same plugin. Use them together for the full workflow, or independently.

## Key Constraints

- **File output mandatory** -- full reports go to `.claude/research/`, never the conversation
- **Actionable over interesting** -- every recommendation must be implementable
- **Specificity required** -- "Use Framer Motion 11.x" not "use animations"
- **Evidence-backed** -- include URLs to real-world examples
- **Accessibility default** -- all recommendations must be accessible
