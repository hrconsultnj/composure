/**
 * No-bandaids rules — language-specific enforcement.
 *
 * Ported from hooks/enforcement/no-bandaids.sh.
 * Each rule maps 1:1 to the bash implementation.
 */

import type { Rule, Language } from "../types.js";

// ── TypeScript / JavaScript (13 rules) ─────────────────────────────

const typescriptRules: Rule[] = [
  {
    name: "as-any",
    pattern: /\bas\s+any\b/,
    severity: "error",
    message:
      "'as any' detected. Use a type guard, satisfies, or fix the type at its source.",
    languages: ["typescript"],
  },
  {
    name: "double-cast",
    pattern: /\bas\s+unknown\s+as\b/,
    severity: "error",
    message:
      "'as unknown as T' detected. Use a type guard to narrow unknown to T.",
    languages: ["typescript"],
  },
  {
    name: "ts-suppress",
    pattern: /\/\/\s*@ts-(ignore|expect-error|nocheck)/,
    severity: "error",
    message:
      "TS suppression comment detected. Fix the type error. Do not suppress it.",
    languages: ["typescript"],
    nonTestOnly: true,
  },
  {
    name: "ts-suppress",
    pattern: /\/\/\s*@ts-(ignore|nocheck)/,
    severity: "error",
    message:
      "@ts-ignore/@ts-nocheck detected. Use @ts-expect-error in test files (it fails when the error is fixed).",
    languages: ["typescript"],
    testFileOnly: true,
  },
  {
    name: "eslint-ts-disable",
    pattern: /\/\/\s*eslint-disable.*@typescript-eslint/,
    severity: "error",
    message: "eslint-disable for @typescript-eslint rule detected. Fix the type.",
    languages: ["typescript"],
  },
  {
    name: "non-null-assertion",
    pattern: /\w+!\.\w+|\w+!\[/,
    severity: "error",
    message:
      "Non-null assertion (!) detected. Use optional chaining (?.) with a null guard.",
    languages: ["typescript"],
  },
  {
    name: "underscore-unused",
    pattern: /catch\s*\(\s*_\w+\)|const\s+_\w+\s*=\s*await|,\s*_\w+\s*[:\)]/,
    severity: "error",
    message:
      "Underscore-prefixed unused variable detected. Remove it. For catch blocks, use catch {} (TS 5.x optional catch binding).",
    languages: ["typescript"],
  },
  {
    name: "any-param",
    pattern: /\(\s*\w+\s*:\s*any\s*[,\)]/,
    severity: "error",
    message:
      "Parameter typed as 'any' detected. Define an interface. Use React.ChangeEvent<T>, useLocalSearchParams<T>, etc.",
    languages: ["typescript"],
  },
  {
    name: "return-assertion",
    pattern: /return\s+.*\bas\s+[A-Z]\w+/,
    severity: "error",
    message:
      "Return type assertion detected. Use satisfies, a type guard, or annotate the function return type.",
    languages: ["typescript"],
  },
  {
    name: "hidden-any-generic",
    pattern:
      /Record<[^,]+,\s*any\s*>|Array<\s*any\s*>|Promise<\s*any\s*>|Map<[^,]+,\s*any\s*>|Set<\s*any\s*>/,
    severity: "error",
    message:
      "Hidden 'any' in generic type parameter (Record<string, any>, Array<any>, etc.). Use 'unknown' or a specific type.",
    languages: ["typescript"],
  },
  {
    name: "lazy-type",
    pattern: /:\s*Function\b|:\s*Object\b/,
    severity: "error",
    message:
      "Lazy type (Function or Object). Use specific signature (() => void) or Record<string, unknown>.",
    languages: ["typescript"],
  },
  {
    name: "any-return",
    pattern: /\)\s*:\s*any\s*[{;]|\)\s*:\s*any\s*=>/,
    severity: "error",
    message:
      "Function with explicit ': any' return type. Define the actual return type.",
    languages: ["typescript"],
  },
  {
    name: "supabase-client-query",
    pattern: /\.from\(\s*['"]/,
    severity: "error",
    message:
      "Direct Supabase .from() query in a 'use client' component. Client components should fetch via TanStack Query + server actions, not direct database calls.",
    languages: ["typescript"],
    writeOnly: true,
    // Special: only triggers in 'use client' files — handled by engine
  },
];

// ── Python (7 rules) ───────────────────────────────────────────────

const pythonRules: Rule[] = [
  {
    name: "type-ignore",
    pattern: /type:\s*ignore/,
    severity: "error",
    message: "Fix the type error instead of ignoring it.",
    languages: ["python"],
  },
  {
    name: "bare-except",
    pattern: /except\s*:/,
    severity: "error",
    message: "Catch specific exceptions, not bare except.",
    languages: ["python"],
  },
  {
    name: "broad-except",
    pattern: /except\s+Exception\s*:/,
    severity: "error",
    message: "Catch specific exceptions, not Exception.",
    languages: ["python"],
  },
  {
    name: "bare-noqa",
    pattern: /# noqa$/m,
    severity: "error",
    message: "Use specific noqa code: # noqa: E501.",
    languages: ["python"],
  },
  {
    name: "any-type",
    pattern: /:\s*Any\b/,
    severity: "error",
    message: "Use a specific type instead of Any.",
    languages: ["python"],
  },
  {
    name: "os-system",
    pattern: /os\.system\(/,
    severity: "error",
    message: "Use subprocess.run() with list arguments.",
    languages: ["python"],
  },
  {
    name: "eval",
    pattern: /eval\(/,
    severity: "error",
    message: "Never use eval().",
    languages: ["python"],
  },
];

// ── Go (4 rules) ──────────────────────────────────────────────────

const goRules: Rule[] = [
  {
    name: "err-discard",
    pattern: /_\s*=\s*err/,
    severity: "error",
    message: "Handle the error or return it with context.",
    languages: ["go"],
  },
  {
    name: "empty-interface",
    pattern: /interface\{\}/,
    severity: "error",
    message: "Use 'any' keyword or generics (Go 1.18+).",
    languages: ["go"],
  },
  {
    name: "bare-nolint",
    pattern: /\/\/nolint$/m,
    severity: "error",
    message: "Add justification: //nolint:lintername // reason.",
    languages: ["go"],
  },
  {
    name: "panic",
    pattern: /panic\(/,
    severity: "error",
    message: "Return error instead of panicking.",
    languages: ["go"],
    nonTestOnly: true,
    // Special: skipped in package main — handled by engine
  },
];

// ── Rust (2 rules) ────────────────────────────────────────────────

const rustRules: Rule[] = [
  {
    name: "unwrap",
    pattern: /\.unwrap\(\)/,
    severity: "error",
    message: "Use ? operator or .expect('reason') instead of .unwrap().",
    languages: ["rust"],
    nonTestOnly: true,
  },
  {
    name: "unsafe",
    pattern: /unsafe\s*\{/,
    severity: "error",
    message:
      "unsafe block without // SAFETY: comment. Add a SAFETY comment explaining the invariants.",
    languages: ["rust"],
    // Special: skipIf preceding SAFETY comment — handled by engine
  },
];

// ── C++ (3 rules) ─────────────────────────────────────────────────

const cppRules: Rule[] = [
  {
    name: "using-namespace-std",
    pattern: /using namespace std/,
    severity: "error",
    message: "Use std:: prefix in headers instead of 'using namespace std'.",
    languages: ["cpp"],
    // Special: header files only — handled by engine
  },
  {
    name: "null-macro",
    pattern: /\bNULL\b/,
    severity: "error",
    message: "Use nullptr instead of NULL.",
    languages: ["cpp"],
  },
  {
    name: "define-const",
    pattern: /#define\s+[A-Z_]+\s+\d/,
    severity: "error",
    message: "Use constexpr instead of #define for constants.",
    languages: ["cpp"],
  },
];

// ── Swift (3 rules) ───────────────────────────────────────────────

const swiftRules: Rule[] = [
  {
    name: "force-unwrap",
    pattern: /[^!]=.*[^?]!/,
    severity: "error",
    message:
      "Use guard let, if let, or ?? instead of force unwrap (!).",
    languages: ["swift"],
    nonTestOnly: true,
  },
  {
    name: "force-cast",
    pattern: /\bas!\b/,
    severity: "error",
    message: "Use 'as?' with optional binding instead of force cast 'as!'.",
    languages: ["swift"],
    nonTestOnly: true,
  },
  {
    name: "try-force",
    pattern: /\btry!/,
    severity: "error",
    message: "Use do/try/catch or try? instead of try!.",
    languages: ["swift"],
    nonTestOnly: true,
  },
];

// ── Kotlin (3 rules) ──────────────────────────────────────────────

const kotlinRules: Rule[] = [
  {
    name: "non-null-assert",
    pattern: /!!/,
    severity: "error",
    message:
      "Use ?.let { }, ?:, or safe calls instead of !! assertion.",
    languages: ["kotlin"],
    nonTestOnly: true,
  },
  {
    name: "run-blocking",
    pattern: /\brunBlocking\b/,
    severity: "error",
    message:
      "Use lifecycleScope.launch or viewModelScope.launch instead of runBlocking.",
    languages: ["kotlin"],
    nonTestOnly: true,
  },
  {
    name: "bare-return-async",
    pattern: /return@AsyncFunction\s*$/m,
    severity: "error",
    message:
      "Use 'return@AsyncFunction null' — bare return sends Unit, Expo expects Any?.",
    languages: ["kotlin"],
    nonTestOnly: true,
  },
];

// ── All rules ─────────────────────────────────────────────────────

export const ALL_RULES: Rule[] = [
  ...typescriptRules,
  ...pythonRules,
  ...goRules,
  ...rustRules,
  ...cppRules,
  ...swiftRules,
  ...kotlinRules,
];

/** Get rules for a specific language. */
export function getRulesForLanguage(lang: string): Rule[] {
  return ALL_RULES.filter((r) =>
    r.languages.includes(lang as Language),
  );
}
