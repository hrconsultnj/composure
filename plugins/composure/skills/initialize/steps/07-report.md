# Step 7: Report

Print a summary:

```
Composure initialized for <project-name>

Stack detected:
  - TypeScript 5.9 (strict) -- apps/web, apps/mobile
  - Python 3.12 + FastAPI 0.115 -- services/api
  - Go 1.23 -- services/worker
  - Monorepo (pnpm workspaces)

Generated:
  + .claude/no-bandaids.json (6 extensions, 8 skip patterns, 3 frameworks)
  + tasks-plans/tasks.md (task queue ready)

Framework reference docs (.claude/frameworks/ -- categorized):
  + .claude/frameworks/frontend/generated/ (3 docs)
  + .claude/frameworks/fullstack/nextjs/generated/ (1 doc)
  + .claude/frameworks/backend/python/generated/ (3 docs)
  + .claude/frameworks/backend/go/generated/ (1 doc)

Code review graph:
  + 153 nodes, 883 edges, 23 files

Active hooks:
  - PreToolUse: architecture trigger, no-bandaids (multi-framework)
  - PostToolUse: decomposition check, graph update

Available skills:
  /blueprint           -- Pre-work assessment (graph-powered)
  /app-architecture    -- Feature building guide
  /decomposition-audit -- Codebase size violation scan
  /review-tasks        -- Process accumulated quality tasks
  /review-pr           -- PR review with impact analysis
  /review-delta        -- Changes since last commit
  /build-graph         -- Build/update code review graph
  /code-organizer      -- Restructure project layout
```

---

**Next:** Read `steps/08-companion-plugins.md`
