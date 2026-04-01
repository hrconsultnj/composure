# Step 3: Companion Plugin Triage

Install companion plugins **conditionally** based on what the project actually needs. Respect the context health status from Step 1.

```bash
INSTALLED=$(claude plugin list 2>/dev/null)
```

## Triage Rules

| Plugin | Condition | Rationale |
|--------|-----------|-----------|
| **Sentinel** (security) | **Always install** | Every project has attack surface. Secrets, injection, dependencies — no preconditions needed. |
| **Testbench** (testing) | Only if tests exist | Check for: `*.test.*`, `*.spec.*`, `__tests__/`, or a `"test"` script in `package.json`. No test infra = no point loading test hooks. |
| **Shipyard** (CI/CD) | Only if deployment config exists | Check for: `.github/workflows/`, `.gitlab-ci.yml`, `Dockerfile`, `docker-compose.yml`, `vercel.json`, `fly.toml`, `netlify.toml`, `railway.json`. No deployment = no need. |
| **Design Forge** (premium UI) | Only if frontend detected | Check for: any `frontend` value in `.claude/no-bandaids.json` frameworks (nextjs, vite, expo, angular, etc.) OR design deps in package.json (framer-motion, gsap, three, @react-three/fiber). No frontend = no need. |
| **Composure Pro** (Supabase patterns) | Only if Supabase detected | Check for: `supabase/config.toml` OR `supabase/migrations/` directory. Requires GitHub collaborator access (paid). |

## Detection Commands

```bash
# Testbench: check for test files or test script
TEST_EXISTS=$(find . -maxdepth 4 \( -name "*.test.*" -o -name "*.spec.*" -o -name "__tests__" \) -print -quit 2>/dev/null)
TEST_SCRIPT=$(node -e "try{const p=require('./package.json');console.log(p.scripts?.test?'yes':'no')}catch{console.log('no')}" 2>/dev/null)

# Shipyard: check for CI/deployment config
CI_EXISTS=$(ls .github/workflows/*.yml .gitlab-ci.yml Dockerfile docker-compose.yml vercel.json fly.toml netlify.toml 2>/dev/null | head -1)

# Design Forge: check for frontend framework or design deps
FRONTEND_DETECTED=$(jq -r '[.frameworks[].frontend // empty] | map(select(. != "null")) | length' .claude/no-bandaids.json 2>/dev/null)
DESIGN_DEPS=$(grep -qE '"(framer-motion|gsap|three|@react-three/fiber|@react-three/drei|lottie-react|motion|animejs|p5)"' package.json 2>/dev/null && echo "yes")

# Composure Pro: check for Supabase
SUPABASE_EXISTS=$(ls supabase/config.toml supabase/migrations/ 2>/dev/null | head -1)
```

## Context Health Gate

If Step 1 reported `atThreshold: true`:
- **Sentinel**: still auto-install (security is non-negotiable)
- **Testbench, Shipyard, Design Forge**: present as opt-in instead of auto-installing
  ```
  Note: You're at N enabled plugins (threshold for {contextWindow} is M).
  Testbench, Shipyard, and Design Forge are available but would add more context overhead.
  Install them? [y/N]
  ```

If NOT at threshold: auto-install all that pass the condition check.

## Installation

For each plugin that passes triage:

```bash
echo "$INSTALLED" | grep -q sentinel     || claude plugin install sentinel@my-claude-plugins
echo "$INSTALLED" | grep -q testbench    || claude plugin install testbench@my-claude-plugins
echo "$INSTALLED" | grep -q shipyard     || claude plugin install shipyard@my-claude-plugins
echo "$INSTALLED" | grep -q design-forge || claude plugin install design-forge@my-claude-plugins
```

For Composure Pro (special handling):
```bash
echo "$INSTALLED" | grep -q composure-pro || claude plugin install composure-pro@github:hrconsultnj/composure-private
```

If the Composure Pro install fails with an auth error, do NOT retry — instead report:
"Composure Pro is a paid add-on that requires GitHub access to the private repo. Visit https://buymeacoffee.com/hrconsultnj/e/524085 to get a license, or reach out at hrconsultnj@gmail.com for access."

## Post-Install Initialization

After installing, initialize each plugin if its config is missing:

1. If `.claude/sentinel.json` does not exist: run `/sentinel:initialize`
2. If `.claude/testbench.json` does not exist: run `/testbench:initialize`
3. If `.claude/shipyard.json` does not exist: run `/shipyard:initialize`
4. If Supabase detected AND `.claude/composure-pro.json` does not exist: run `/composure-pro:activate`

If plugins were already installed and initialized, skip silently.

## Composure Pro — pluginRoot Validation

**Always run this check when Composure Pro is installed, even if already initialized.**

The `pluginRoot` field in `.claude/composure-pro.json` is the integration bridge between Composure and Composure Pro. It tells `app-architecture` where to find pattern files (data-patterns/, rls-policies/). This path is version-specific and goes stale on plugin updates.

```bash
# Read stored pluginRoot
STORED_ROOT=$(jq -r '.pluginRoot // ""' .claude/composure-pro.json 2>/dev/null)

# Check if the path still exists and has pattern files
if [ -z "$STORED_ROOT" ] || [ ! -d "${STORED_ROOT}/data-patterns" ]; then
  # pluginRoot is stale or missing — needs refresh
  NEEDS_REFRESH=true
fi
```

**If refresh needed**, update the config with the current plugin root:

```bash
# Get current Composure Pro plugin path from Claude's plugin system
PRO_PATH=$(claude plugin list --json 2>/dev/null | node -e "
  const plugins = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  const p = plugins.find(x => x.id.startsWith('composure-pro') && x.enabled);
  if (p) console.log(p.installPath);
")

if [ -n "$PRO_PATH" ] && [ -d "${PRO_PATH}/data-patterns" ]; then
  # Update pluginRoot in config
  jq --arg root "$PRO_PATH" '.pluginRoot = $root' .claude/composure-pro.json > .claude/composure-pro.json.tmp \
    && mv .claude/composure-pro.json.tmp .claude/composure-pro.json
  # Report
  echo "Composure Pro pluginRoot refreshed: $PRO_PATH"
else
  echo "Composure Pro installed but pattern files not found. License may need validation — restart to trigger license check."
fi
```

**Why this matters:** Without a valid `pluginRoot`, the `app-architecture` skill can't load Supabase patterns (entity registry, RLS policies, ID prefix, multi-tenant isolation). The user gets generic architecture guidance instead of the Pro patterns they paid for. This check ensures the bridge stays valid across plugin updates.

**When to skip:** If `.claude/composure-pro.json` doesn't exist (not a Pro user), skip entirely.

## Report

```
Companion plugins:
  + Sentinel: installed and initialized (security scanning)
  = Testbench: already initialized
  - Shipyard: skipped (no CI/CD config detected)
  + Design Forge: installed (premium UI patterns, /design-forge, /ux-researcher)
  - Composure Pro: skipped (no Supabase detected)
```

Note: Newly installed plugins need a Claude Code restart (Ctrl+C then `claude`) for their hooks to activate. Skills work immediately but hooks only load on startup.

---

**Next:** Read `steps/04-detect-stack.md`
