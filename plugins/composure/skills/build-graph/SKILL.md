---
name: build-graph
description: Build or update the code review knowledge graph, generate the visualization, and open it. Run this first to initialize, or let hooks keep it updated automatically.
argument-hint: "[full] [--no-open]"
---

Build or incrementally update the persistent code knowledge graph, generate a standalone HTML visualization, and open it in the browser.

## Content Loading

This skill's content is served from the Composure API. Before reading a step, fetch it:

```bash
composure-fetch skill composure build-graph {step-filename}
```

Cached content is at `~/.composure/cache/composure/skills/build-graph/`. If cached, read directly from there.

