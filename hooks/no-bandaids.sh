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

# ─── Report ──────────────────────────────────────────────────────
if [[ -n "$VIOLATIONS" ]]; then
  printf 'BLOCKED: Band-aid fix in %s. Fix the root cause:\n' "$BASENAME" >&2
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

  exit 2
fi

exit 0
