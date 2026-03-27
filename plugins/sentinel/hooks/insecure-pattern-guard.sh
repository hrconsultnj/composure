#!/usr/bin/env bash
set -euo pipefail

# insecure-pattern-guard.sh — PreToolUse hook that blocks writes containing insecure code patterns.
# Catches security anti-patterns (injection, XSS, deprecated crypto, etc.) per language.
# Non-blocking on infrastructure error: always exits 0 on failure.
#
# Exit codes:
#   0 = pass (no issues or infrastructure error)
#   2 = BLOCK (insecure pattern detected)

TAG="[sentinel:insecure-pattern]"

# ─── Read tool input from stdin ──────────────────────────────────
INPUT=$(cat) || { printf '%s infrastructure error: failed to read stdin\n' "$TAG" >&2; exit 0; }
TOOL_NAME=$(printf '%s' "$INPUT" | jq -r '.tool_name' 2>/dev/null) || { printf '%s infrastructure error: jq unavailable\n' "$TAG" >&2; exit 0; }

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

# ─── Detect language from file extension ─────────────────────────
LANG=""
case "$BASENAME" in
  *.ts|*.tsx|*.js|*.jsx)  LANG="typescript" ;;
  *.py)                   LANG="python" ;;
  *.go)                   LANG="go" ;;
  *.rs)                   LANG="rust" ;;
esac
[[ -z "$LANG" ]] && exit 0

# ─── Skip test files, generated files, .d.ts ─────────────────────
case "$BASENAME" in
  *.d.ts)                                          exit 0 ;;
  *.test.*|*.spec.*|*_test.go|*_test.py|*_test.rs) exit 0 ;;
  *.generated.*|*.gen.*)                            exit 0 ;;
esac
case "$FILE_PATH" in
  */tests/*|*/test/*|*/__tests__/*|*/fixtures/*|*/mocks/*) exit 0 ;;
esac

# ─── Check helper ────────────────────────────────────────────────
# usage: check <regex> <issue-description> <fix-suggestion>
VIOLATIONS=""

check() {
  local regex="$1" issue="$2" fix="$3"
  if printf '%s\n' "$CONTENT" | grep -qE "$regex"; then
    VIOLATIONS="${VIOLATIONS}\n- ${issue}. ${fix}"
  fi
  return 0
}

# Like check() but only fires when a second "safe" pattern is NOT present
check_unless() {
  local regex="$1" safe_regex="$2" issue="$3" fix="$4"
  if printf '%s\n' "$CONTENT" | grep -qE "$regex"; then
    if ! printf '%s\n' "$CONTENT" | grep -qE "$safe_regex"; then
      VIOLATIONS="${VIOLATIONS}\n- ${issue}. ${fix}"
    fi
  fi
  return 0
}

# ─── Per-language checks ─────────────────────────────────────────
case "$LANG" in

  typescript)
    check '\beval\(' \
      "Code injection: eval()" \
      "Remove eval() entirely. Use JSON.parse(), a lookup table, or structured alternatives"

    check '\bdocument\.write\(' \
      "XSS vector: document.write()" \
      "Use DOM APIs (createElement, textContent) instead of document.write()"

    check '\.innerHTML\s*=' \
      "XSS vector: innerHTML assignment" \
      "Use textContent for plain text or sanitize with DOMPurify before assigning innerHTML"

    check_unless 'dangerouslySetInnerHTML' 'DOMPurify|sanitize|purify|sanitizeHtml' \
      "XSS risk: dangerouslySetInnerHTML without sanitization" \
      "Sanitize content with DOMPurify.sanitize() before passing to dangerouslySetInnerHTML"

    check 'crypto\.createCipher\(' \
      "Deprecated crypto: crypto.createCipher()" \
      "Use crypto.createCipheriv() with an explicit IV for secure encryption"

    check '\bnew\s+Function\(' \
      "Code injection: new Function()" \
      "Replace new Function() with a direct function definition or a safe alternative"

    check '\bdocument\.location\s*=' \
      "Open redirect risk: document.location assignment" \
      "Validate the URL against an allowlist before assigning to document.location"

    check 'postMessage\([^,)]+,\s*["\x27]\*["\x27]' \
      "Wildcard origin in postMessage" \
      "Specify the exact target origin instead of '*' in postMessage()"
    ;;

  python)
    check '\beval\(' \
      "Code injection: eval()" \
      "Use ast.literal_eval() for data or structured alternatives instead of eval()"

    check '\bexec\(' \
      "Code injection: exec()" \
      "Remove exec() and restructure the code to avoid dynamic execution"

    check '\bos\.system\(' \
      "Command injection: os.system()" \
      "Use subprocess.run() with a list of arguments instead of os.system()"

    check 'shell\s*=\s*True' \
      "Command injection: shell=True in subprocess" \
      "Pass command as a list and remove shell=True to prevent shell injection"

    check '\bpickle\.loads?\(' \
      "Deserialization attack: pickle.load(s)" \
      "Use json or a safe serialization format. Never unpickle untrusted data"

    check_unless '\byaml\.load\(' 'Loader\s*=\s*SafeLoader|yaml\.safe_load' \
      "Arbitrary code execution: yaml.load() without SafeLoader" \
      "Use yaml.safe_load() or pass Loader=SafeLoader to yaml.load()"

    check '\b__import__\(' \
      "Dynamic import injection: __import__()" \
      "Use standard import statements or importlib with validated module names"

    check '\bmark_safe\(' \
      "XSS risk: Django mark_safe()" \
      "Ensure content is fully sanitized before mark_safe(), or use format_html() instead"
    ;;

  go)
    # SQL injection: fmt.Sprintf used to build query strings
    if printf '%s\n' "$CONTENT" | grep -qE 'fmt\.Sprintf\s*\(' && \
       printf '%s\n' "$CONTENT" | grep -qiE '(SELECT|INSERT|UPDATE|DELETE|WHERE|FROM|JOIN)\b'; then
      VIOLATIONS="${VIOLATIONS}\n- SQL injection: fmt.Sprintf with SQL query. Use parameterized queries (db.Query with $1 or ? placeholders)"
    fi

    check 'http\.ListenAndServe\(' \
      "Insecure listener: http.ListenAndServe without TLS" \
      "Use http.ListenAndServeTLS() or place behind a TLS-terminating reverse proxy"

    check 'ioutil\.ReadAll\(' \
      "Memory exhaustion: ioutil.ReadAll without size limit" \
      "Use io.LimitReader() to cap the read size before ReadAll, or use io.ReadAll with a LimitedReader"

    check 'template\.HTML\(' \
      "XSS risk: template.HTML() marks content as safe" \
      "Sanitize the input before wrapping with template.HTML(), or use auto-escaping templates"
    ;;

  rust)
    # Command injection: Command::new with variable (not string literal)
    if printf '%s\n' "$CONTENT" | grep -qE 'Command::new\s*\(' && \
       ! printf '%s\n' "$CONTENT" | grep -qE 'Command::new\s*\(\s*"[^"]*"\s*\)'; then
      VIOLATIONS="${VIOLATIONS}\n- Command injection risk: Command::new with dynamic input. Validate or allowlist the command name and use .arg() for arguments"
    fi

    # SQL injection via format! with query-like strings
    if printf '%s\n' "$CONTENT" | grep -qE 'format!\s*\(' && \
       printf '%s\n' "$CONTENT" | grep -qiE '(SELECT|INSERT|UPDATE|DELETE|WHERE|FROM)\b'; then
      VIOLATIONS="${VIOLATIONS}\n- SQL injection: format! macro with SQL query string. Use parameterized queries with your database driver (sqlx::query!, diesel, etc.)"
    fi
    ;;

esac

# ─── Report ──────────────────────────────────────────────────────
if [[ -n "$VIOLATIONS" ]]; then
  printf '%s BLOCKED in %s:\n' "$TAG" "$BASENAME" >&2
  printf '%b\n' "$VIOLATIONS" >&2
  exit 2
fi

exit 0
