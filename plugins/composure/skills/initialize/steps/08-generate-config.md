# Step 8: Generate Config

Create `.claude/no-bandaids.json`:

**Always include `composureVersion`** — the init-check SessionStart hook uses this to detect when the plugin has been updated and the project config needs refreshing. Extract the version from `$CLAUDE_PLUGIN_ROOT` path (e.g., `composure/1.5.1/` → `"1.5.1"`).

```json
{
  "composureVersion": "1.5.1",
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

## Auto-generating project-specific frameworkValidation rules

After generating the base config, scan the generated framework docs for regex-blockable anti-patterns. **Plugin-level rules** in `defaults/framework-rules.json` are always active and cover universal patterns (Tailwind directives, hsl→oklch, Supabase ANON_KEY, Zod message→error, .js extensions). Project rules should only cover patterns specific to this project.

**Process:**

1. For each `*.md` in `{generatedRefsRoot}/**/generated/`:
   - Find lines starting with `- ❌` — these are anti-patterns
   - Find `| Before |` migration table rows — these contain deprecated patterns
2. For each anti-pattern, determine if it contains a concrete code pattern (import statement, function call, config value) that a regex can match
3. If regex-blockable AND not already covered by a plugin default rule: generate a `frameworkValidation` rule with:
   - `appliesTo`: glob based on the doc's category (frontend → `**/*.tsx`, mobile → `apps/mobile/**`)
   - `pattern`: regex extracted from the anti-pattern text
   - `severity`: `"error"` for deprecated/removed patterns, `"warn"` for style preferences
   - `message`: the anti-pattern's explanation text
   - `skipIf`: (optional) pattern that indicates correct usage alongside the detected pattern
4. Also add project-specific rules from `CLAUDE.md` hard rules (e.g., icon library choice, workspace package naming)

**Example project-specific rules** (these vary per project, unlike plugin defaults):

```json
{
  "icons": {
    "appliesTo": ["**/*.tsx", "**/*.ts"],
    "rules": [
      {
        "pattern": "from\\s+['\"]lucide-react['\"]",
        "severity": "error",
        "message": "This project uses @iconify/react, not lucide-react.",
        "skipIf": "@iconify/react"
      }
    ]
  }
}
```

**Do NOT duplicate plugin default rules.** Check `defaults/framework-rules.json` for existing coverage before adding a project rule. Plugin group names are reserved — project groups with matching names are silently skipped by the hook.

## pnpm supply chain hardening check

After generating the config, check the project's `package.json` for postinstall script protection. This is a critical supply chain defense — it prevents malicious packages from executing arbitrary code during `pnpm install`.

**Check for:**

1. `pnpm.onlyBuiltDependencies` — whitelist of packages allowed to run install scripts (legacy setting)
2. `pnpm.allowBuilds` — granular build script control (newer pnpm, replaces onlyBuiltDependencies)

**If neither exists** in the root `package.json`:

```
[composure:init] WARNING: No postinstall script protection detected.

Your package.json is missing pnpm.onlyBuiltDependencies or pnpm.allowBuilds.
Without this, ANY dependency can execute arbitrary code during `pnpm install`.

Case study: Axios supply chain attack (2026-03-31) deployed a RAT via a postinstall
script in a malicious transitive dependency. onlyBuiltDependencies would have blocked it.

Add to your package.json:
  "pnpm": {
    "onlyBuiltDependencies": ["esbuild", "sharp", "@tailwindcss/oxide"]
  }

Only whitelist packages that genuinely need build scripts (native binaries, etc.).
Run `pnpm ignored-builds` to see what's currently blocked.
```

**If it exists**, report it as a positive finding in Step 11:
```
Supply chain hardening:
  + pnpm.onlyBuiltDependencies active (N packages whitelisted)
```

**Do NOT auto-add this setting** — the whitelist must be curated per project. Just warn and provide the template.

---

**Next:** Read `steps/09-build-graph.md`
