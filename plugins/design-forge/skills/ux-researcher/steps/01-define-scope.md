# Step 1: Define Research Scope

Clarify what we're researching before executing any searches.

## Questions to Ask

```yaml
questions_to_ask:
  - What specific feature/pattern are we researching?
  - What's the target industry/domain?
  - What's the technical context (React, Next.js, etc.)?
  - What are the performance constraints?
  - What's the complexity tolerance?
  - Do we need animations/3D/advanced features?
```

## Classify Research Type

Based on the user's request, determine which research type applies:

| Type | Trigger Phrases | Depth |
|------|----------------|-------|
| Quick Research | "What should we use for...", "Quick comparison of..." | 15-30 min |
| Full Research | "Research design patterns for...", "Analyze competitors for..." | 1-2 hours |
| Technology Comparison | "Should we use [X] or [Y]?", "Best animation library for..." | 30-60 min |
| Competitive Analysis | "Analyze competitors for [category]" | 1-2 hours |
| Industry Standards | "Research industry standards for [domain]" | 30-60 min |

## Determine Research Scope

From the user's request, extract:

1. **Topic** -- the specific feature, pattern, or technology
2. **Industry/Domain** -- property management, SaaS, e-commerce, etc.
3. **Technical Context** -- framework, existing tech stack
4. **Constraints** -- performance budget, bundle size limits, complexity tolerance
5. **Output Type** -- which report template to use (see Step 4)

If the user's request is ambiguous, ask for clarification on the top 2-3 unknowns. Do not ask all six questions -- infer what you can from context.

---

**Next:** Read `steps/02-execute-research.md`
