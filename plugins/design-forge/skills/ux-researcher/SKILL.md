---
name: ux-researcher
description: AI-powered design research agent that uses web search to discover design patterns, analyze competitors, research industry trends, evaluate modern web technologies, and create actionable reports for design-forge implementation. Automates the intelligence gathering phase of design work.
---

# UX Researcher (AI Design Intelligence)

## Overview

AI-powered design research agent that autonomously gathers intelligence through web search to inform design decisions. This skill does the groundwork research that feeds into the design-forge skill, discovering patterns, technologies, and approaches that work in the real world.

**Not for manual user research** - This is an AI research agent that uses WebSearch and WebFetch to analyze existing products, discover patterns, and create actionable design intelligence reports.

## When to Use This Skill

Invoke when you need research **before** designing:
- "Research design patterns for [feature type]"
- "What are modern approaches to [UI pattern]?"
- "Analyze competitors for [product category]"
- "Should we use [technology] for [use case]?"
- "Research industry standards for [domain]"
- "What animation libraries work best for [scenario]?"
- "Find examples of [design pattern] in production"
- "What's the product-market fit for [feature]?"

**Output**: Actionable research reports that `/design-forge` uses to implement solutions.

## Relationship to design-forge

This skill is the **research phase** of the design-forge workflow:

```
ux-researcher (research) → design-forge (implement)
```

1. **ux-researcher** discovers patterns, evaluates technologies, analyzes competitors
2. **design-forge** applies those findings using its component library and reference guides

Both skills ship in the same plugin. Use them together for the full workflow, or independently.

## Core Research Capabilities

### 1. Web-Based Design Research

Uses **WebSearch** and **WebFetch** to discover real-world implementations, patterns, and approaches.

**Research Process**:
```yaml
search_strategy:
  broad_discovery: "Find landscape of approaches"
  pattern_identification: "Identify common patterns"
  technology_evaluation: "Assess modern tech stacks"
  evidence_gathering: "Capture examples and screenshots"
  synthesis: "Create actionable report"
```

**Example Research Queries**:
```
"modern dashboard design 2025"
"best animation libraries for React"
"property management UI patterns"
"3D integration in web applications"
"Framer Motion vs GSAP comparison"
```

**Research Report Structure**:
```markdown
# Design Research Report: [Topic]

## Executive Summary
- Research goal
- Key findings (3-5 bullets)
- Recommended approach

## Technology Landscape
- Modern solutions available
- Technology comparison matrix
- Performance vs. capability trade-offs

## Pattern Analysis
- Common patterns identified
- Industry standards observed
- Best practices discovered

## Examples & Evidence
- Real-world implementations (with URLs)
- Technology choices they made
- Why their approach works

## Recommendations
- Primary recommendation with rationale
- Alternative approaches
- Implementation considerations
- Tech stack suggestion
```

### 2. Automated Competitive Analysis

Discovers how competitors and industry leaders solve similar problems.

**Competitive Research Process**:
1. **Identify Competitors**: Search for products in same category
2. **Analyze Implementations**: Study their design choices
3. **Technology Detection**: Identify tech stacks they use
4. **Pattern Extraction**: Find common approaches
5. **Gap Analysis**: Identify opportunities to differentiate

**Competitor Analysis Template**:
```markdown
## Competitor: [Name]

### Design Approach
- Overall design philosophy
- Key patterns used
- User experience flow

### Technology Stack Observed
- Frontend framework
- Animation libraries (if detectable)
- UI component library
- Notable features (3D, advanced animations, etc.)

### Strengths
- What they do exceptionally well
- Innovative approaches
- User feedback (if available)

### Weaknesses
- UX friction points
- Missing features
- Performance issues
- Areas we can improve upon

### Technology Insights
- Why they likely chose this tech
- Performance characteristics
- Implementation complexity
- Maintenance considerations

### Lessons for Our Design
- Patterns to adopt
- Approaches to avoid
- Opportunities identified
```

### 3. Design Pattern Discovery

Finds proven patterns from existing products and design systems.

**Pattern Research Areas**:
- **Navigation Patterns**: Header styles, mobile menus, breadcrumbs
- **Data Display**: Tables, cards, lists, grids, dashboards
- **Forms & Input**: Multi-step forms, validation, autocomplete
- **Feedback**: Loading states, errors, success messages, toasts
- **Animations**: Page transitions, micro-interactions, scroll effects
- **3D Integration**: Product viewers, interactive models, decorative elements

**Pattern Discovery Process**:
```yaml
search_queries:
  - "[pattern type] design examples 2025"
  - "modern [feature] UI patterns"
  - "[industry] application design patterns"
  - "best practices [interaction type]"

analysis:
  - Common elements across implementations
  - Technology choices for each pattern
  - Performance characteristics
  - Accessibility considerations
  - Mobile/responsive approaches

output:
  - Pattern catalog with examples
  - Technology recommendations
  - Implementation complexity
  - When to use vs. avoid
```

### 4. Industry Standards & Conventions Research

Discovers conventions and best practices for specific industries or domains.

**Research Focus**:
- Industry-specific UI patterns
- Domain terminology and workflows
- Regulatory requirements (accessibility, compliance)
- User expectations in this industry
- Mobile vs. desktop preferences

**Industry Research Template**:
```markdown
## Industry: [Domain]

### Standard Patterns
- Common UI conventions users expect
- Industry-specific terminology
- Workflow patterns

### Technology Trends
- What modern apps in this space use
- Animation and interaction patterns
- Mobile vs. desktop split
- Performance expectations

### Accessibility & Compliance
- WCAG requirements
- Industry-specific regulations
- Best practices for this domain

### User Expectations
- What users are accustomed to
- Pain points in existing solutions
- Opportunities for innovation

### Technology Recommendations
- Suggested tech stack for this domain
- Animation libraries that fit use case
- 3D integration opportunities
- Performance requirements
```

### 5. Modern Web Technology Research

Evaluates modern technologies for sophisticated design needs.

**Technology Categories**:

#### Animation Libraries
```markdown
## Framer Motion
**Best For**: React page transitions, component animations, gesture interactions
**Complexity**: Medium | **Performance**: Good (GPU-accelerated) | **Bundle**: ~40KB
**When to Choose**: React-based projects, declarative animations preferred

## GSAP (GreenSock)
**Best For**: Complex scroll animations, timelines, morphing
**Complexity**: Medium-High | **Performance**: Excellent | **Bundle**: ~50KB
**When to Choose**: Need precise control, complex timelines, framework-agnostic

## CSS Animations + Tailwind
**Best For**: Simple transitions, hover effects, basic interactions
**Complexity**: Low | **Performance**: Excellent (native) | **Bundle**: 0KB
**When to Choose**: Simple needs, bundle size matters

## Motion One
**Best For**: Lightweight animations with modern API
**Complexity**: Low-Medium | **Performance**: Excellent | **Bundle**: ~5KB
**When to Choose**: Bundle size critical, modern API wanted
```

#### 3D Integration Technologies
```markdown
## Three.js + React Three Fiber
**Best For**: Custom 3D scenes, WebGL effects, interactive 3D
**Complexity**: High | **Performance**: Heavy (but controllable with LOD) | **Bundle**: ~150KB+
**When to Choose**: Custom 3D needed, full control required

## Spline
**Best For**: Quick 3D prototypes, no-code 3D design
**Complexity**: Low | **Performance**: Medium | **Bundle**: ~100KB
**When to Choose**: Designers creating 3D without code

## Blender (via MCP)
**Best For**: Custom 3D model creation, production assets
**Complexity**: High | **Performance**: Excellent (static exports) | **Bundle**: Model size only
**When to Choose**: Need custom 3D assets, not real-time rendering

## CSS 3D Transforms
**Best For**: Card flips, simple 3D effects
**Complexity**: Low | **Performance**: Excellent (GPU-accelerated) | **Bundle**: 0KB
**When to Choose**: Simple 3D effects, no library needed
```

**Technology Decision Matrix**:
```markdown
| Need | Technology | Complexity | Performance | When to Use |
|------|-----------|------------|-------------|-------------|
| Simple animations | CSS + Tailwind | Low | Excellent | Hover effects, fades |
| Page transitions | Framer Motion | Medium | Good | React apps, declarative |
| Scroll animations | GSAP | High | Excellent | Complex narratives |
| Quick 3D | Spline | Low | Medium | Marketing, prototypes |
| Custom 3D | Three.js | High | Heavy | Product viewers, games |
| Production 3D | Blender MCP | High | Excellent | Custom models export |
| UI Components | shadcn/ui | Low | Good | Most web apps |
| Animations + UI | Framer | Medium | Good | Motion-first sites |
```

### 6. Creating Actionable Design Reports

Synthesizes research into reports that design-forge can immediately use.

**Report Structure**:
```markdown
# Design Intelligence Report: [Feature/Component]

## Design Goal
[What we're trying to achieve]

## Research Summary
- **Competitor Analysis**: N competitors analyzed
- **Pattern Discovery**: N patterns identified
- **Technology Research**: N technologies evaluated
- **Industry Standards**: N key conventions found

## Recommended Approach

### Primary Recommendation
**Pattern**: [Specific pattern name]
**Technology**: [Specific tech stack]
**Rationale**: [Why this works best]
**Examples**: [2-3 real implementations with URLs]

### Technology Stack
framework: Next.js 15 (App Router)
ui_library: shadcn/ui
animations: Framer Motion (for page transitions)
3d_integration: Spline (for hero section 3D element)
styling: Tailwind CSS
performance: Next.js Image, Server Components

### Implementation Complexity
- **Effort**: Medium (3-5 days)
- **Learning Curve**: Low-Medium
- **Maintenance**: Low
- **Performance Impact**: Minimal (+50KB bundle)

## Alternative Approaches
[Options with trade-offs]

## Design Patterns Identified
[Patterns with examples and URLs]

## Implementation Roadmap
### Phase 1: Foundation
### Phase 2: Interactions
### Phase 3: Advanced Features

## Performance Considerations
- Bundle size impact
- Load time impact
- Mitigation strategies
- Lighthouse targets

## Accessibility Notes
- prefers-reduced-motion support
- Keyboard navigation
- WCAG 2.1 AA compliance
- Screen reader patterns

## References & Examples
[URLs to excellent implementations]

## Next Steps for design-forge
1. Review technology recommendations
2. Install required packages
3. Reference pattern examples
4. Start with Phase 1
5. Progressive enhancement
6. Test performance
7. Validate accessibility
```

## Research Workflow

### 1. Define Research Scope
```yaml
questions_to_ask:
  - What specific feature/pattern are we researching?
  - What's the target industry/domain?
  - What's the technical context (React, Next.js, etc.)?
  - What are the performance constraints?
  - What's the complexity tolerance?
  - Do we need animations/3D/advanced features?
```

### 2. Execute Web Research
```yaml
search_phase:
  competitors:
    - Search: "[industry] [feature] applications 2025"
    - Fetch: Competitor websites
    - Analyze: Patterns, tech stacks, approaches

  patterns:
    - Search: "modern [feature] UI patterns"
    - Search: "[feature] design best practices"
    - Fetch: Design system documentation
    - Analyze: Common patterns across sources

  technology:
    - Search: "Framer Motion vs GSAP 2025"
    - Search: "best animation library React"
    - Search: "Three.js vs Spline comparison"
    - Fetch: Official documentation
    - Analyze: Performance, complexity, use cases

  industry:
    - Search: "[industry] UI conventions"
    - Search: "[industry] web app examples"
    - Analyze: Standards and expectations
```

### 3. Synthesize Findings
```yaml
synthesis_process:
  - Group patterns by type
  - Compare technology options
  - Identify best practices
  - Extract implementation examples
  - Create comparison matrices
  - Develop recommendations
```

### 4. Create Actionable Report
```yaml
report_components:
  executive_summary: "Key findings and recommendations"
  technology_stack: "Specific libraries and tools"
  pattern_catalog: "Discovered patterns with examples"
  implementation_plan: "Phased approach with timelines"
  references: "URLs to examples and documentation"
```

### 5. Hand Off to design-forge
```yaml
handoff:
  - Design intelligence report (markdown)
  - Technology recommendations with rationale
  - Pattern examples with URLs
  - Implementation complexity estimates
  - Performance and accessibility notes
```

## Common Research Scenarios

### "Research dashboard design patterns"

**Process**: Search modern dashboard UIs → Fetch 5-10 examples → Analyze layout/data viz/navigation → Identify tech stacks → Report patterns + recommendations

**Expected Output**: Patterns catalog (grid layouts, sidebar nav, card widgets, real-time updates) + tech stack (shadcn/ui, Recharts, Framer Motion, TanStack Query)

### "Should we use 3D for product showcase?"

**Process**: Search 3D product viewers → Compare Spline vs Three.js → Analyze performance → Create decision matrix

**Expected Output**: Phased recommendation (Spline MVP → Three.js if needed → image fallback) with bundle sizes and mobile considerations

### "Research animation library for React app"

**Process**: Search library comparisons → Fetch docs and benchmarks → Analyze use cases → Create recommendation matrix

**Expected Output**: Use-case-based recommendations (CSS for simple, Framer Motion for pages, GSAP for scroll, progressive enhancement strategy)

## Success Criteria

Quality research delivers:
- **Actionable recommendations** (not just interesting findings)
- **Technology specifics** (library names, versions, bundle sizes)
- **Real-world examples** (URLs to live implementations)
- **Performance data** (bundle sizes, load times, benchmarks)
- **Complexity estimates** (implementation time, learning curve)
- **Clear decision matrices** (when to use what)
- **Ready for design-forge** (can immediately start implementing)

## Output Formats

### Quick Research (15-30 min)
```markdown
# Quick Research: [Topic]
## Recommendation
[Technology/Pattern] because [Reason]
## Alternatives
1. [Option] - [Trade-off]
## Examples
- [URL 1] - [Why it's relevant]
```

### Full Research Report (1-2 hours)
Complete template as shown in "Creating Actionable Design Reports" section

### Technology Comparison (30-60 min)
Comparison matrices with bundle sizes, performance, use cases, examples

## Pro Tips

1. **Be Specific**: "Use Framer Motion 11.x" not "use animations"
2. **Provide Evidence**: Always include URLs to examples
3. **Consider Context**: Tech choices depend on project constraints
4. **Bundle Awareness**: Always report bundle size impact
5. **Performance First**: Recommend fastest option that meets needs
6. **Progressive Enhancement**: Start simple, add complexity if needed
7. **Real Examples**: Theory is nice, working examples are essential
8. **Decision Matrices**: Help designers choose with clear trade-offs
9. **Accessibility Default**: All recommendations must be accessible
10. **Actionable Reports**: Designer should know exactly what to do next
