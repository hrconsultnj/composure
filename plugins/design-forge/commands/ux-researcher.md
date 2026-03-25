---
name: ux-researcher
description: Research design patterns, analyze competitors, and evaluate technologies before building
argument-hint: [research-topic]
---

AI-powered design research agent. Uses web search to discover patterns, analyze competitors, evaluate technologies, and create actionable reports.

## How to Use

If `$ARGUMENTS` is provided, begin researching that topic immediately using WebSearch and WebFetch. Follow the research workflow from `${CLAUDE_PLUGIN_ROOT}/skills/ux-researcher/SKILL.md`.

If no argument, ask the user what they want to research. Common research types:

**Pattern Research**
- "Research dashboard design patterns"
- "Find modern navigation patterns for SaaS"
- "What are best practices for data-heavy tables?"

**Technology Evaluation**
- "Should we use Framer Motion or GSAP?"
- "Evaluate 3D integration options for product showcase"
- "Best animation library for React in 2025"

**Competitive Analysis**
- "Analyze competitors in [product category]"
- "How do leading [industry] apps handle [feature]?"

**Industry Standards**
- "Research [industry] UI conventions"
- "What do users expect from [domain] apps?"

## Output

Research produces a **Design Intelligence Report** with:
- Technology recommendations (specific libraries, bundle sizes)
- Real-world examples with URLs
- Decision matrices for trade-offs
- Implementation complexity estimates
- Performance and accessibility notes

## Workflow with design-forge

Research first, then implement:
```
/ux-researcher [topic]     → produces research report
/design-forge [component]  → implements using research findings
```
