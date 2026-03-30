# Step 0: Scope Detection

Determine what kind of working directory we're in **before** doing anything else. This sets the strategy for all subsequent steps.

## Detection Logic

Run these checks in order:

```bash
# 1. Check for package.json (single project or monorepo root)
[ -f "package.json" ] && echo "HAS_PKG=true"

# 2. Check for monorepo markers
[ -f "turbo.json" ] || [ -f "pnpm-workspace.yaml" ] || [ -f "lerna.json" ] && echo "MONOREPO=true"

# 3. Check for plugin.json (composure plugin repo)
[ -f "plugin.json" ] && echo "PLUGIN_REPO=true"

# 4. Check for .git (inside a repo)
[ -d ".git" ] && echo "GIT_REPO=true"

# 5. If no package.json and no .git, check if children have .git
# (multi-project parent like ~/Projects)
ls -d */.git 2>/dev/null | head -5
```

## Scope Types

| Scope | Detected When | Strategy |
|-------|--------------|----------|
| `single-project` | Has `package.json`, no workspace markers | Normal init flow (Steps 1-12) |
| `monorepo` | Has `turbo.json`, `pnpm-workspace.yaml`, or `lerna.json` | Detect workspace paths, init once with multi-path awareness |
| `plugin-repo` | Has `plugin.json` at root | Use `skills/app-architecture/` as framework doc root instead of `.claude/frameworks/` |
| `multi-project` | No `package.json`, multiple child dirs with `.git` | Fan-out mode (see below) |
| `empty` | No recognizable structure | Report "No project detected" and stop |

## Multi-Project Fan-Out

When scope is `multi-project`:

1. **List child projects** with basic info:
   ```
   Detected multi-project root with N child projects:
     cipher-platform/  (Next.js + Supabase monorepo, last commit Mar 25)
     etal-crm/         (Next.js + Supabase monorepo, last commit Mar 28)
     ...
   ```

2. **Build graphs for all child projects** (these are independent and can be parallel):
   ```
   For each child with .git:
     call build_or_update_graph({ repo_root: childPath, full_rebuild: true })
   ```

3. **Skip steps 1-8** (config generation, Context7 docs, task queue) — these are per-project.
   Jump directly to Step 1 (Context Health) and Step 3 (Companion Triage).

4. **Report available cross-project queries**:
   ```
   Graphs built for N projects. You can now query across projects:
     - entity_scope({ repo_root: "path" }) — domain entities per project
     - semantic_search_nodes({ query: "auth", repo_root: "path" }) — find code across projects
     - query_graph({ pattern: "imports_of", target: "file", repo_root: "path" })
   ```

## Output

Set a `scope` variable (used by subsequent steps):

```json
{
  "scope": "single-project" | "monorepo" | "plugin-repo" | "multi-project" | "empty",
  "children": ["cipher-platform", "etal-crm"],  // only for multi-project
  "monorepoWorkspaces": ["apps/web", "packages/shared"],  // only for monorepo
  "pluginRoot": "skills/app-architecture/"  // only for plugin-repo
}
```

---

**Next:** Read `steps/01-context-health.md`
