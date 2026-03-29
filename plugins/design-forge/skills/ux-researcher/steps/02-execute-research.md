# Step 2: Execute Web Research

Uses **WebSearch** and **WebFetch** to discover real-world implementations, patterns, and approaches.

## Search Strategy

```yaml
search_strategy:
  broad_discovery: "Find landscape of approaches"
  pattern_identification: "Identify common patterns"
  technology_evaluation: "Assess modern tech stacks"
  evidence_gathering: "Capture examples and screenshots"
  synthesis: "Create actionable report"
```

## Search Query Templates

```
"modern [feature] design 2025"
"best [technology type] libraries for React"
"[industry] UI patterns"
"[technology A] vs [technology B] comparison"
"[feature] design best practices"
"[industry] [feature] applications 2025"
```

## Research Phases

Execute the relevant phases based on the research type identified in Step 1.

### Phase A: Competitor Analysis

1. **Identify Competitors**: Search for products in same category
2. **Analyze Implementations**: Study their design choices
3. **Technology Detection**: Identify tech stacks they use
4. **Pattern Extraction**: Find common approaches
5. **Gap Analysis**: Identify opportunities to differentiate

> If analyzing competitors, read `references/competitor-analysis-template.md` for the per-competitor template.

Search queries:
```yaml
competitors:
  - Search: "[industry] [feature] applications 2025"
  - Fetch: Competitor websites
  - Analyze: Patterns, tech stacks, approaches
```

### Phase B: Design Pattern Discovery

Finds proven patterns from existing products and design systems.

**Pattern Research Areas**:
- **Navigation Patterns**: Header styles, mobile menus, breadcrumbs
- **Data Display**: Tables, cards, lists, grids, dashboards
- **Forms & Input**: Multi-step forms, validation, autocomplete
- **Feedback**: Loading states, errors, success messages, toasts
- **Animations**: Page transitions, micro-interactions, scroll effects
- **3D Integration**: Product viewers, interactive models, decorative elements

Search queries:
```yaml
patterns:
  - Search: "modern [feature] UI patterns"
  - Search: "[feature] design best practices"
  - Fetch: Design system documentation
  - Analyze: Common patterns across sources
```

Analysis checklist:
- Common elements across implementations
- Technology choices for each pattern
- Performance characteristics
- Accessibility considerations
- Mobile/responsive approaches

### Phase C: Technology Evaluation

Search queries:
```yaml
technology:
  - Search: "Framer Motion vs GSAP 2025"
  - Search: "best animation library React"
  - Search: "Three.js vs Spline comparison"
  - Fetch: Official documentation
  - Analyze: Performance, complexity, use cases
```

> If evaluating technology options, read `references/technology-matrix.md` for the animation/3D comparison tables and decision matrix.

### Phase D: Industry Standards Research

Search queries:
```yaml
industry:
  - Search: "[industry] UI conventions"
  - Search: "[industry] web app examples"
  - Analyze: Standards and expectations
```

> If researching industry standards, read `references/industry-research-template.md` for the template structure.

**Research Focus**:
- Industry-specific UI patterns
- Domain terminology and workflows
- Regulatory requirements (accessibility, compliance)
- User expectations in this industry
- Mobile vs. desktop preferences

## Common Research Scenarios

### "Research dashboard design patterns"

**Process**: Search modern dashboard UIs -> Fetch 5-10 examples -> Analyze layout/data viz/navigation -> Identify tech stacks -> Report patterns + recommendations

**Expected Output**: Patterns catalog (grid layouts, sidebar nav, card widgets, real-time updates) + tech stack (shadcn/ui, Recharts, Framer Motion, TanStack Query)

### "Should we use 3D for product showcase?"

**Process**: Search 3D product viewers -> Compare Spline vs Three.js -> Analyze performance -> Create decision matrix

**Expected Output**: Phased recommendation (Spline MVP -> Three.js if needed -> image fallback) with bundle sizes and mobile considerations

### "Research animation library for React app"

**Process**: Search library comparisons -> Fetch docs and benchmarks -> Analyze use cases -> Create recommendation matrix

**Expected Output**: Use-case-based recommendations (CSS for simple, Framer Motion for pages, GSAP for scroll, progressive enhancement strategy)

---

**Next:** Read `steps/03-synthesize.md`
