# Step 8: Generate Config

Create `.claude/no-bandaids.json`:

```json
{
  "extensions": [".ts", ".tsx", ".js", ".jsx", ".py", ".go"],
  "skipPatterns": ["*.d.ts", "*.generated.*", "__pycache__/*"],
  "disabledRules": [],
  "typegenHint": "pnpm --filter @myapp/database generate",
  "frameworks": {
    "typescript": {
      "paths": ["apps/web"],
      "frontend": "vite",
      "backend": null,
      "versions": { "typescript": "5.9", "react": "19.2", "vite": "8.0" }
    },
    "python": {
      "paths": ["services/api"],
      "frontend": null,
      "backend": "fastapi",
      "versions": { "python": "3.12", "fastapi": "0.115" }
    }
  },
  "generatedRefsRoot": ".claude/frameworks"
}
```

**If `frontend` is `"nextjs"`**, also add `frameworkValidation` to enforce server component boundaries:

```json
{
  "frameworkValidation": {
    "nextjs": {
      "appliesTo": ["src/app/**/page.tsx", "src/app/**/layout.tsx", "src/app/**/loading.tsx", "app/**/page.tsx", "app/**/layout.tsx", "app/**/loading.tsx"],
      "rules": [
        {
          "pattern": "^['\"]use client['\"]",
          "severity": "error",
          "message": "Server component file has 'use client'. Pages, layouts, and loading files MUST be server components. Extract interactive parts into a separate client component in components/ and import it. See fullstack/nextjs/01-ssr-hydration-layout.md.",
          "skipIf": "error\\.tsx"
        },
        {
          "pattern": "useState.*new\\s+Date|useEffect.*new\\s+Date",
          "severity": "error",
          "message": "Server component using client hooks (useState/useEffect). Move interactive logic to a client component.",
          "skipIf": "use client"
        }
      ]
    }
  }
}
```

Merge this into the same `.claude/no-bandaids.json` file alongside the `frameworks` field. The `frameworkValidation` section is read by `no-bandaids.sh` at PreToolUse time and blocks writes that violate the patterns.

The `frameworks` field tells `no-bandaids.sh` which rules to apply based on file path and extension. The `frontend` and `backend` fields control which reference docs and architecture patterns get loaded — preventing Next.js patterns from bleeding into Vite projects, and vice versa.

`generatedRefsRoot` points to where Context7-generated docs live for this project. For user projects this is `.claude/frameworks/` (project-level). For the composure plugin repo itself, it's `skills/app-architecture/`. Generated docs are distributed into `frontend/`, `fullstack/`, `mobile/`, or `backend/` subfolders based on the library-to-path mapping in Step 3.

---

**Next:** Read `steps/09-build-graph.md`
