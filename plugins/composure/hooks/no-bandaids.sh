#!/usr/bin/env bash
set -euo pipefail

# no-bandaids.sh — Global PreToolUse hook that blocks band-aid fixes across languages.
# Prevents Claude (and subagents) from using shortcuts instead of fixing root causes.
#
# Config: place .claude/no-bandaids.json in any project to customize:
# {
#   "extensions": [".ts", ".tsx", ".js", ".jsx"],
#   "skipPatterns": ["*.d.ts", "*.generated.*"],
#   "disabledRules": ["non-null-assertion"],
#   "typegenHint": "pnpm --filter @my-app/database generate",
#   "frameworks": { "typescript": { ... }, "python": { ... }, "go": { ... } }
# }
#
# Without config or frameworks field, defaults to TypeScript rules only.

INPUT=$(cat)
TOOL_NAME=$(printf '%s' "$INPUT" | jq -r '.tool_name')

# Extract content being written — use printf throughout (portable, no flag interpretation)
if [[ "$TOOL_NAME" == "Write" ]]; then
  CONTENT=$(printf '%s' "$INPUT" | jq -r '.tool_input.content // ""')
elif [[ "$TOOL_NAME" == "Edit" ]]; then
  CONTENT=$(printf '%s' "$INPUT" | jq -r '.tool_input.new_string // ""')
else
  exit 0
fi

[[ -z "$CONTENT" ]] && exit 0

FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // "unknown"')
BASENAME=$(basename "$FILE_PATH")
PROJECT_DIR=$(printf '%s' "$INPUT" | jq -r '.cwd // ""')

# Fallback: derive project root from FILE_PATH if .cwd is empty
if [[ -z "$PROJECT_DIR" || ! -d "$PROJECT_DIR" ]]; then
  PROJECT_DIR=$(git -C "$(dirname "$FILE_PATH")" rev-parse --show-toplevel 2>/dev/null)
fi
# Final fallback: walk up from FILE_PATH looking for .claude/ or .git/
if [[ -z "$PROJECT_DIR" || ! -d "$PROJECT_DIR" ]]; then
  _dir=$(dirname "$FILE_PATH")
  while [[ "$_dir" != "/" && "$_dir" != "." ]]; do
    if [[ -d "${_dir}/.git" || -f "${_dir}/.claude/no-bandaids.json" ]]; then
      PROJECT_DIR="$_dir"
      break
    fi
    _dir=$(dirname "$_dir")
  done
fi

# ─── Self-protection: block Claude from modifying enforcement configs ───
case "$FILE_PATH" in
  */.claude/no-bandaids.json|*/.claude/sentinel.json|*/.claude/composure-pro.json|*/.claude/testbench.json|*/.claude/shipyard.json)
    printf 'BLOCKED: Enforcement config files cannot be modified by Claude. Ask the user to update %s manually.\n' "$BASENAME" >&2
    exit 2 ;;
esac

# ─── Load project config (optional) ───────────────────────────────
CONFIG_FILE="${PROJECT_DIR}/.claude/no-bandaids.json"
if [[ -f "$CONFIG_FILE" ]]; then
  CONFIG=$(cat "$CONFIG_FILE")
else
  CONFIG='{}'
fi

# ─── Detect language from file extension ──────────────────────────
LANG=""
case "$BASENAME" in
  *.ts|*.tsx|*.js|*.jsx)           LANG="typescript" ;;
  *.py)                            LANG="python" ;;
  *.go)                            LANG="go" ;;
  *.rs)                            LANG="rust" ;;
  *.cpp|*.cc|*.cxx|*.hpp|*.h)     LANG="cpp" ;;
  *.swift)                         LANG="swift" ;;
  *.kt|*.kts)                     LANG="kotlin" ;;
esac
[[ -z "$LANG" ]] && exit 0

# ─── Check if this language is in configured frameworks ───────────
if printf '%s' "$CONFIG" | jq -e '.frameworks' >/dev/null 2>&1; then
  if ! printf '%s' "$CONFIG" | jq -e ".frameworks.${LANG}" >/dev/null 2>&1; then
    exit 0
  fi
else
  # No frameworks field — backward compat: only run for typescript
  [[ "$LANG" != "typescript" ]] && exit 0
fi

# ─── Resolve skip patterns ────────────────────────────────────────
DEFAULT_SKIPS=("*.d.ts" "*.generated.*" "*.gen.*")
if printf '%s' "$CONFIG" | jq -e '.skipPatterns' >/dev/null 2>&1; then
  SKIP_PATTERNS=$(printf '%s' "$CONFIG" | jq -r '.skipPatterns[]')
else
  SKIP_PATTERNS=$(printf '%s\n' "${DEFAULT_SKIPS[@]}")
fi
for pattern in $SKIP_PATTERNS; do
  case "$BASENAME" in
    $pattern) exit 0 ;;
  esac
done

# ─── Detect test files ────────────────────────────────────────────
IS_TEST_FILE=false
case "$BASENAME" in
  *.test.*|*.spec.*|*_test.go|*_test.py) IS_TEST_FILE=true ;;
esac
case "$FILE_PATH" in
  */tests/*|*/test/*|*/__tests__/*) IS_TEST_FILE=true ;;
esac

# ─── Resolve disabled rules ──────────────────────────────────────
DISABLED_RULES=""
if printf '%s' "$CONFIG" | jq -e '.disabledRules' >/dev/null 2>&1; then
  DISABLED_RULES=$(printf '%s' "$CONFIG" | jq -r '.disabledRules[]' | tr '\n' '|')
fi

is_rule_enabled() {
  local rule_name="$1"
  if [[ -n "$DISABLED_RULES" ]] && printf '%s' "$rule_name" | grep -qE "^(${DISABLED_RULES%|})$"; then
    return 1
  fi
  return 0
}

check() { # usage: check <rule-name> <regex> <message>
  is_rule_enabled "$1" && printf '%s\n' "$CONTENT" | grep -qE "$2" && \
    VIOLATIONS="${VIOLATIONS}\n- $3"
  return 0
}

# ─── Run checks ──────────────────────────────────────────────────
VIOLATIONS=""

case "$LANG" in
  typescript)
    check "as-any"        '\bas\s+any\b' \
      "'as any' detected. Use a type guard, satisfies, or fix the type at its source."
    check "double-cast"   '\bas\s+unknown\s+as\b' \
      "'as unknown as T' detected. Use a type guard to narrow unknown to T."
    if is_rule_enabled "ts-suppress"; then
      if [[ "$IS_TEST_FILE" == "true" ]]; then
        printf '%s\n' "$CONTENT" | grep -qE '//\s*@ts-(ignore|nocheck)' && \
          VIOLATIONS="${VIOLATIONS}\n- @ts-ignore/@ts-nocheck detected. Use @ts-expect-error in test files (it fails when the error is fixed)."
      else
        printf '%s\n' "$CONTENT" | grep -qE '//\s*@ts-(ignore|expect-error|nocheck)' && \
          VIOLATIONS="${VIOLATIONS}\n- TS suppression comment detected. Fix the type error. Do not suppress it."
      fi
    fi
    check "eslint-ts-disable" '//\s*eslint-disable.*@typescript-eslint' \
      "eslint-disable for @typescript-eslint rule detected. Fix the type."
    check "non-null-assertion" '\w+!\.\w+|\w+!\[' \
      "Non-null assertion (!) detected. Use optional chaining (?.) with a null guard."
    check "underscore-unused" 'catch\s*\(\s*_\w+\)|const\s+_\w+\s*=\s*await|,\s*_\w+\s*[:\)]' \
      "Underscore-prefixed unused variable detected. Remove it. For catch blocks, use catch {} (TS 5.x optional catch binding)."
    check "any-param" '\(\s*\w+\s*:\s*any\s*[,\)]' \
      "Parameter typed as 'any' detected. Define an interface. Use React.ChangeEvent<T>, useLocalSearchParams<T>, etc."
    check "return-assertion" 'return\s+.*\bas\s+[A-Z]\w+' \
      "Return type assertion detected. Use satisfies, a type guard, or annotate the function return type."
    check "hidden-any-generic" 'Record<[^,]+,\s*any\s*>|Array<\s*any\s*>|Promise<\s*any\s*>|Map<[^,]+,\s*any\s*>|Set<\s*any\s*>' \
      "Hidden 'any' in generic type parameter (Record<string, any>, Array<any>, etc.). Use 'unknown' or a specific type."
    check "lazy-type" ':\s*Function\b|:\s*Object\b' \
      "Lazy type (Function or Object). Use specific signature (() => void) or Record<string, unknown>."
    check "any-return" '\)\s*:\s*any\s*[{;]|\)\s*:\s*any\s*=>' \
      "Function with explicit ': any' return type. Define the actual return type."
    # Supabase direct queries in "use client" components (Write = full file content)
    if [[ "$TOOL_NAME" == "Write" ]] && is_rule_enabled "supabase-client-query"; then
      if printf '%s\n' "$CONTENT" | grep -q "'use client'" || printf '%s\n' "$CONTENT" | grep -q '"use client"'; then
        if printf '%s\n' "$CONTENT" | grep -qE '\.from\(\s*['\''"]'; then
          VIOLATIONS="${VIOLATIONS}\n- Direct Supabase .from() query in a 'use client' component. Client components should fetch via TanStack Query + server actions, not direct database calls. Move queries to a server action in actions/ or a route handler in api/."
        fi
      fi
    fi
    ;;
  python)
    check "type-ignore"     'type:\s*ignore'          "Fix the type error instead of ignoring it."
    check "bare-except"     'except\s*:'               "Catch specific exceptions, not bare except."
    check "broad-except"    'except\s+Exception\s*:'   "Catch specific exceptions, not Exception."
    check "bare-noqa"       '# noqa$'                  "Use specific noqa code: # noqa: E501."
    check "any-type"        ':\s*Any\b'                "Use a specific type instead of Any."
    check "os-system"       'os\.system\('             "Use subprocess.run() with list arguments."
    check "eval"            'eval\('                   "Never use eval()."
    ;;
  go)
    check "err-discard"     '_\s*=\s*err'              "Handle the error or return it with context."
    check "empty-interface" 'interface\{\}'            "Use 'any' keyword or generics (Go 1.18+)."
    check "bare-nolint"     '//nolint$'                "Add justification: //nolint:lintername // reason."
    if is_rule_enabled "panic" && [[ "$IS_TEST_FILE" == "false" ]]; then
      # Allow panic in main packages and test files
      if ! printf '%s\n' "$CONTENT" | grep -q '^package main$'; then
        check "panic" 'panic\(' "Return error instead of panicking."
      fi
    fi
    ;;
  rust)
    if [[ "$IS_TEST_FILE" == "false" ]]; then
      check "unwrap"  '\.unwrap\(\)' "Use ? operator or .expect('reason') instead of .unwrap()."
    fi
    # unsafe without SAFETY comment (check line-by-line is impractical; flag any unsafe block)
    if is_rule_enabled "unsafe" && printf '%s\n' "$CONTENT" | grep -qE 'unsafe\s*\{'; then
      if ! printf '%s\n' "$CONTENT" | grep -qB1 '// SAFETY:' 2>/dev/null | grep -q 'unsafe'; then
        VIOLATIONS="${VIOLATIONS}\n- unsafe block without // SAFETY: comment. Add a SAFETY comment explaining the invariants."
      fi
    fi
    ;;
  cpp)
    if [[ "$BASENAME" == *.h || "$BASENAME" == *.hpp ]]; then
      check "using-namespace-std" 'using namespace std' "Use std:: prefix in headers instead of 'using namespace std'."
    fi
    check "null-macro"    '\bNULL\b'                     "Use nullptr instead of NULL."
    check "define-const"  '#define\s+[A-Z_]+\s+\d'       "Use constexpr instead of #define for constants."
    ;;
  swift)
    if [[ "$IS_TEST_FILE" == "false" ]]; then
      check "force-unwrap"  '[^!]=.*[^?]!'               "Use guard let, if let, or ?? instead of force unwrap (!)."
      check "force-cast"    '\bas!\b'                     "Use 'as?' with optional binding instead of force cast 'as!'."
      check "try-force"     '\btry!'                      "Use do/try/catch or try? instead of try!."
    fi
    ;;
  kotlin)
    if [[ "$IS_TEST_FILE" == "false" ]]; then
      check "non-null-assert"  '!!'                       "Use ?.let { }, ?:, or safe calls instead of !! assertion."
      check "run-blocking"     '\brunBlocking\b'           "Use lifecycleScope.launch or viewModelScope.launch instead of runBlocking."
      check "bare-return-async" 'return@AsyncFunction\s*$' "Use 'return@AsyncFunction null' — bare return sends Unit, Expo expects Any?."
    fi
    ;;
esac

# ─── Framework validation rules ──────────────────────────────────
# Two-layer system:
#   1. Plugin defaults ($CLAUDE_PLUGIN_ROOT/defaults/framework-rules.json)
#      — universal rules, cannot be disabled by project config
#   2. Project config (no-bandaids.json frameworkValidation)
#      — project-specific rules, additive only
# Severity "error" → blocks. Severity "warn" → warns only.
WARNINGS=""

# Get relative path from project root for glob matching
REL_PATH="${FILE_PATH#"$PROJECT_DIR"/}"

# ─── Helper: process a set of framework validation groups ─────────
# Args: $1 = JSON string containing groups, $2 = "plugin" or "project" (for messages)
process_fv_groups() {
  local FV_JSON="$1"
  local SOURCE="$2"

  for GROUP in $(printf '%s' "$FV_JSON" | jq -r 'keys[]' 2>/dev/null); do
    # Check if file matches any appliesTo glob pattern
    local MATCH=false
    for GLOB_PATTERN in $(printf '%s' "$FV_JSON" | jq -r ".\"$GROUP\".appliesTo[]" 2>/dev/null); do
      local REGEX_PATTERN
      # Convert glob to regex: ** → any depth, * → one segment, dots escaped
      # Uses placeholders to prevent sed passes from clobbering each other
      REGEX_PATTERN=$(printf '%s' "$GLOB_PATTERN" | sed 's/\*\*/__DBLSTAR__/g; s/\./\\./g; s/\*/__STAR__/g; s/__DBLSTAR__/.*/g; s/__STAR__/[^\/]*/g')
      if printf '%s' "$REL_PATH" | grep -qE "^${REGEX_PATTERN}$"; then
        MATCH=true
        break
      fi
    done
    [[ "$MATCH" == "false" ]] && continue

    # Process each rule in this group
    local RULE_COUNT
    RULE_COUNT=$(printf '%s' "$FV_JSON" | jq ".\"$GROUP\".rules | length" 2>/dev/null)
    [[ -z "$RULE_COUNT" || "$RULE_COUNT" == "null" ]] && continue

    for ((i=0; i<RULE_COUNT; i++)); do
      local RULE_PATTERN RULE_SEVERITY RULE_MESSAGE RULE_SKIPIF
      RULE_PATTERN=$(printf '%s' "$FV_JSON" | jq -r ".\"$GROUP\".rules[$i].pattern")
      RULE_SEVERITY=$(printf '%s' "$FV_JSON" | jq -r ".\"$GROUP\".rules[$i].severity")
      RULE_MESSAGE=$(printf '%s' "$FV_JSON" | jq -r ".\"$GROUP\".rules[$i].message")
      RULE_SKIPIF=$(printf '%s' "$FV_JSON" | jq -r ".\"$GROUP\".rules[$i].skipIf // empty")

      # Skip if content matches skipIf pattern
      if [[ -n "$RULE_SKIPIF" ]] && printf '%s\n' "$CONTENT" | grep -qE "$RULE_SKIPIF"; then
        continue
      fi

      # Check if content matches the violation pattern
      if printf '%s\n' "$CONTENT" | grep -qE "$RULE_PATTERN"; then
        if [[ "$RULE_SEVERITY" == "error" ]]; then
          VIOLATIONS="${VIOLATIONS}\n- [${GROUP}] ${RULE_MESSAGE}"
        else
          WARNINGS="${WARNINGS}\n- [${GROUP}] ${RULE_MESSAGE}"
        fi
      fi
    done
  done
}

# ─── Next.js: Block content components in app/ directory ─────
# Only Next.js convention files belong in app/. All other .tsx
# files should live in components/, not co-located with routes.
# Disableable via: "disabledRules": ["nextjs-app-content"]
if is_rule_enabled "nextjs-app-content" && \
   printf '%s' "$CONFIG" | jq -e '[.frameworks[].frontend // empty] | index("nextjs")' >/dev/null 2>&1; then
  case "$REL_PATH" in
    app/*.tsx|src/app/*.tsx)
      case "$BASENAME" in
        page.tsx|layout.tsx|loading.tsx|error.tsx|not-found.tsx|global-error.tsx|template.tsx|default.tsx) ;;
        # Image/metadata convention files (OG images, icons, sitemaps)
        opengraph-image.tsx|twitter-image.tsx|icon.tsx|apple-icon.tsx|sitemap.tsx|robots.tsx|manifest.tsx) ;;
        *)
          VIOLATIONS="${VIOLATIONS}\n- [nextjs-app-content] Content component '${BASENAME}' belongs in components/, not app/. Route directories should only contain Next.js convention files (page/layout/loading/error/not-found/template/default). Move to components/pages/ or components/features/ and import from the route's page.tsx."
          ;;
      esac
      ;;
  esac
fi

# Layer 1: Plugin-level rules (immutable, always applied first)
# Loads: shared.json (always) + category files based on detected stack
PLUGIN_DEFAULTS="${CLAUDE_PLUGIN_ROOT:-/dev/null}/defaults"
ALL_PLUGIN_GROUPS=""

load_plugin_rules() {
  local RULES_FILE="$1"
  [[ ! -f "$RULES_FILE" ]] && return
  local FV
  FV=$(jq -r '.rules' "$RULES_FILE" 2>/dev/null)
  [[ -z "$FV" || "$FV" == "null" ]] && return
  ALL_PLUGIN_GROUPS="${ALL_PLUGIN_GROUPS} $(printf '%s' "$FV" | jq -r 'keys[]' 2>/dev/null)"
  process_fv_groups "$FV" "plugin"
}

# Always load shared rules
load_plugin_rules "${PLUGIN_DEFAULTS}/shared.json"

# Load category rules based on detected stack in project config
if [[ -f "$CONFIG_FILE" ]]; then
  # Frontend framework (nextjs, vite, angular, expo)
  FE=$(printf '%s' "$CONFIG" | jq -r '[.frameworks[].frontend // empty] | map(select(. != "null")) | unique[]' 2>/dev/null)
  for fe in $FE; do
    # Load all frontend/* rules (react, tailwind, shadcn)
    for f in "${PLUGIN_DEFAULTS}"/frontend/*.json; do
      load_plugin_rules "$f"
    done
    case "$fe" in
      nextjs)  load_plugin_rules "${PLUGIN_DEFAULTS}/fullstack/nextjs.json" ;;
      expo)    load_plugin_rules "${PLUGIN_DEFAULTS}/mobile/expo.json" ;;
    esac
  done

  # Backend framework (supabase, express, fastapi, etc.)
  BE=$(printf '%s' "$CONFIG" | jq -r '[.frameworks[].backend // empty] | map(select(. != "null")) | unique[]' 2>/dev/null)
  for be in $BE; do
    case "$be" in
      supabase) load_plugin_rules "${PLUGIN_DEFAULTS}/backend/supabase.json" ;;
    esac
  done

  # Vanilla HTML rules — load for non-framework projects
  if printf '%s' "$CONFIG" | jq -e '.frameworks.html' >/dev/null 2>&1; then
    load_plugin_rules "${PLUGIN_DEFAULTS}/vanilla.json"
  fi

  # SDK rules — detect from project dependencies
  # TanStack Query
  if printf '%s' "$CONFIG" | jq -r '.frameworks[].versions' 2>/dev/null | grep -q 'tanstack-query\|@tanstack/react-query'; then
    load_plugin_rules "${PLUGIN_DEFAULTS}/sdks/tanstack-query.json"
  fi
  # Zod
  if printf '%s' "$CONFIG" | jq -r '.frameworks[].versions' 2>/dev/null | grep -q 'zod'; then
    load_plugin_rules "${PLUGIN_DEFAULTS}/sdks/zod.json"
  fi
fi

# Layer 2: Project-level rules (additive — skip groups that match plugin names)
if printf '%s' "$CONFIG" | jq -e '.frameworkValidation' >/dev/null 2>&1; then
  PROJECT_FV=$(printf '%s' "$CONFIG" | jq -r '.frameworkValidation')
  if [[ -n "$ALL_PLUGIN_GROUPS" ]]; then
    # Build JSON array of plugin group names for filtering
    PLUGIN_KEYS_JSON=$(printf '%s\n' $ALL_PLUGIN_GROUPS | sort -u | jq -R . | jq -s .)
    FILTERED_FV=$(printf '%s' "$PROJECT_FV" | jq --argjson plugin "$PLUGIN_KEYS_JSON" 'with_entries(select(.key as $k | $plugin | index($k) | not))' 2>/dev/null)
    [[ -n "$FILTERED_FV" && "$FILTERED_FV" != "null" ]] && process_fv_groups "$FILTERED_FV" "project"
  else
    process_fv_groups "$PROJECT_FV" "project"
  fi
fi

# ─── Report ──────────────────────────────────────────────────────
if [[ -n "$VIOLATIONS" ]]; then
  printf 'BLOCKED: Fix before proceeding (%s):\n' "$BASENAME" >&2
  printf '%b\n' "$VIOLATIONS" >&2

  if [[ "$LANG" == "typescript" ]]; then
    printf '\nFix with:\n' >&2
    printf '  - satisfies operator for type validation without widening\n' >&2
    printf '  - Type guards (is/in/instanceof) to narrow unknown or union types\n' >&2
    printf '  - Generic type params: useLocalSearchParams<T>, ChangeEvent<T>, Ref<T>\n' >&2
    printf '  - Regenerate types if the schema changed\n' >&2
    TYPEGEN_HINT=$(printf '%s' "$CONFIG" | jq -r '.typegenHint // empty')
    if [[ -n "$TYPEGEN_HINT" ]]; then
      printf '  - Regen: %s\n' "$TYPEGEN_HINT" >&2
    fi
  fi

  # Append warnings if any
  if [[ -n "$WARNINGS" ]]; then
    printf '\nWarnings (non-blocking):\n' >&2
    printf '%b\n' "$WARNINGS" >&2
  fi

  # ─── Escalation counter: force framework doc loading after repeated violations ───
  COUNTER_FILE="/tmp/composure-nobandaids-${CLAUDE_SESSION_ID:-unknown}"
  V_COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
  V_COUNT=$((V_COUNT + 1))
  printf '%d' "$V_COUNT" > "$COUNTER_FILE"

  if [[ "$V_COUNT" -ge 3 ]]; then
    printf '\nMANDATORY ESCALATION: %d violations this session. You MUST invoke /composure:app-architecture NOW to load framework reference docs before attempting any more edits. The generated docs at .claude/frameworks/ contain the correct patterns for this stack.\n' "$V_COUNT" >&2
  fi

  exit 2
fi

# Report warnings even when no blocking violations
if [[ -n "$WARNINGS" ]]; then
  printf 'Framework warnings in %s (non-blocking):\n' "$BASENAME" >&2
  printf '%b\n' "$WARNINGS" >&2
fi

exit 0
