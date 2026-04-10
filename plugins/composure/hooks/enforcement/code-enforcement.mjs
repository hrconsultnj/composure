#!/usr/bin/env node

/**
 * Code Enforcement — PreToolUse Hook (.mjs)
 *
 * Consolidation of no-bandaids.sh + framework-validation.sh into a single
 * Node process. Runs both built-in language rules and config-driven framework
 * validation in one pass.
 *
 * Phase 1: Built-in language rules (band-aid detection)
 * Phase 2: Framework validation (plugin defaults + project config)
 *
 * Severity "error" → blocks (exit 2). Severity "warn" → warns only.
 * Constraint: <300ms total. Single Node process, no subprocess spawns.
 */

import { readFileSync, existsSync, writeFileSync, appendFileSync, readdirSync } from "node:fs";
import { join, basename, dirname, extname, resolve } from "node:path";

// ── Read stdin (hook payload) ───────────────────────────────────
let raw = "";
for await (const chunk of process.stdin) raw += chunk;

const input = JSON.parse(raw);
const filePath = input?.tool_input?.file_path || "";
if (!filePath) process.exit(0);

// ── Self-protection: block config modification (before gate) ────
const base = basename(filePath);
const PROTECTED_FILES = [
  "no-bandaids.json", "sentinel.json", "composure-pro.json",
  "testbench.json", "shipyard.json",
];
for (const pf of PROTECTED_FILES) {
  if (filePath.endsWith(`/.claude/${pf}`) || filePath.endsWith(`/.composure/${pf}`)) {
    process.stderr.write(
      `BLOCKED: Enforcement config files cannot be modified by Claude. Ask the user to update ${base} manually.\n`
    );
    process.exit(2);
  }
}

// ── Source file gate ────────────────────────────────────────────
const ext = extname(filePath).slice(1);

const SOURCE_EXTS = new Set([
  "ts", "tsx", "js", "jsx", "py", "go", "rs",
  "swift", "kt", "kts", "cpp", "cc", "cxx", "hpp", "h", "sql",
]);
if (!SOURCE_EXTS.has(ext)) process.exit(0);

const SKIP_PATHS = [
  "/node_modules/", "/.next/", "/dist/", "/.expo/",
  "/.claude/", "/.composure/", "/memory/",
  "/tasks-plans/", "/blueprints/",
];
if (SKIP_PATHS.some((p) => filePath.includes(p))) process.exit(0);
if (/\.(generated|gen|d)\.[^.]+$/.test(base)) process.exit(0);

// ── Extract content ─────────────────────────────────────────────
const toolName = input?.tool_name || "";
let content = "";
if (toolName === "Write") {
  content = input?.tool_input?.content || "";
} else if (toolName === "Edit") {
  content = input?.tool_input?.new_string || "";
} else {
  process.exit(0);
}
if (!content) process.exit(0);

// ── Derive project root ────────────────────────────────────────
let projectDir = input?.cwd || process.env.CLAUDE_PROJECT_DIR || "";
if (!projectDir || !existsSync(projectDir)) {
  let dir = dirname(filePath);
  while (dir !== "/" && dir !== ".") {
    if (
      existsSync(join(dir, ".git")) ||
      existsSync(join(dir, ".composure", "no-bandaids.json")) ||
      existsSync(join(dir, ".claude", "no-bandaids.json"))
    ) {
      projectDir = dir;
      break;
    }
    dir = dirname(dir);
  }
}
if (!projectDir) process.exit(0);

// ── Load project config ─────────────────────────────────────────
let configPath = join(projectDir, ".composure", "no-bandaids.json");
if (!existsSync(configPath)) {
  configPath = join(projectDir, ".claude", "no-bandaids.json");
}

let config = {};
if (existsSync(configPath)) {
  try {
    config = JSON.parse(readFileSync(configPath, "utf8"));
  } catch {
    config = {};
  }
}

// ── Detect language ─────────────────────────────────────────────
const LANG_MAP = {
  ts: "typescript", tsx: "typescript", js: "typescript", jsx: "typescript",
  py: "python", go: "go", rs: "rust",
  cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp", h: "cpp",
  swift: "swift", kt: "kotlin", kts: "kotlin",
};
const lang = LANG_MAP[ext] || "";
if (!lang) process.exit(0);

// Check if language is in configured frameworks
if (config.frameworks) {
  if (!config.frameworks[lang]) process.exit(0);
} else if (lang !== "typescript") {
  process.exit(0);
}

// ── Skip patterns ───────────────────────────────────────────────
const defaultSkips = ["*.d.ts", "*.generated.*", "*.gen.*"];
const skipPatterns = config.skipPatterns || defaultSkips;

function matchGlob(filename, pattern) {
  const regex = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "__DBLSTAR__")
    .replace(/\*/g, "[^/]*")
    .replace(/__DBLSTAR__/g, ".*");
  return new RegExp(`^${regex}$`).test(filename);
}

if (skipPatterns.some((p) => matchGlob(base, p))) process.exit(0);

// ── Test file detection ─────────────────────────────────────────
const isTestFile =
  /\.(test|spec)\.[^.]+$/.test(base) ||
  /_test\.(go|py)$/.test(base) ||
  /\/(tests|test|__tests__)\//.test(filePath);

// ── Disabled rules ──────────────────────────────────────────────
const disabledRules = new Set(config.disabledRules || []);
const isEnabled = (rule) => !disabledRules.has(rule);

// ──────────────────────────────────────────────────────────────────
// PHASE 1: Built-in language rules (no-bandaids)
// ──────────────────────────────────────────────────────────────────

const violations = [];
const warnings = [];

function check(ruleName, pattern, message) {
  if (!isEnabled(ruleName)) return;
  if (new RegExp(pattern, "m").test(content)) {
    violations.push(message);
  }
}

switch (lang) {
  case "typescript":
    check("as-any", "\\bas\\s+any\\b",
      "'as any' detected. Use a type guard, satisfies, or fix the type at its source.");
    check("double-cast", "\\bas\\s+unknown\\s+as\\b",
      "'as unknown as T' detected. Use a type guard to narrow unknown to T.");

    if (isEnabled("ts-suppress")) {
      if (isTestFile) {
        if (/\/\/\s*@ts-(ignore|nocheck)/m.test(content)) {
          violations.push("@ts-ignore/@ts-nocheck detected. Use @ts-expect-error in test files (it fails when the error is fixed).");
        }
      } else {
        if (/\/\/\s*@ts-(ignore|expect-error|nocheck)/m.test(content)) {
          violations.push("TS suppression comment detected. Fix the type error. Do not suppress it.");
        }
      }
    }

    check("eslint-ts-disable", "//\\s*eslint-disable.*@typescript-eslint",
      "eslint-disable for @typescript-eslint rule detected. Fix the type.");
    check("non-null-assertion", "\\w+!\\.\\w+|\\w+!\\[",
      "Non-null assertion (!) detected. Use optional chaining (?.) with a null guard.");
    check("underscore-unused", "catch\\s*\\(\\s*_\\w+\\)|const\\s+_\\w+\\s*=\\s*await|,\\s*_\\w+\\s*[:\\)]",
      "Underscore-prefixed unused variable detected. Remove it. For catch blocks, use catch {} (TS 5.x optional catch binding).");
    check("any-param", "\\(\\s*\\w+\\s*:\\s*any\\s*[,\\)]",
      "Parameter typed as 'any' detected. Define an interface. Use React.ChangeEvent<T>, useLocalSearchParams<T>, etc.");
    check("return-assertion", "return\\s+.*\\bas\\s+[A-Z]\\w+",
      "Return type assertion detected. Use satisfies, a type guard, or annotate the function return type.");
    check("hidden-any-generic", "Record<[^,]+,\\s*any\\s*>|Array<\\s*any\\s*>|Promise<\\s*any\\s*>|Map<[^,]+,\\s*any\\s*>|Set<\\s*any\\s*>",
      "Hidden 'any' in generic type parameter (Record<string, any>, Array<any>, etc.). Use 'unknown' or a specific type.");
    check("lazy-type", ":\\s*Function\\b|:\\s*Object\\b",
      "Lazy type (Function or Object). Use specific signature (() => void) or Record<string, unknown>.");
    check("any-return", "\\)\\s*:\\s*any\\s*[{;]|\\)\\s*:\\s*any\\s*=>",
      "Function with explicit ': any' return type. Define the actual return type.");

    // Supabase direct queries in "use client" components
    if (toolName === "Write" && isEnabled("supabase-client-query")) {
      if (/['"]use client['"]/.test(content) && /\.from\(\s*['"]/.test(content)) {
        violations.push("Direct Supabase .from() query in a 'use client' component. Client components should fetch via TanStack Query + server actions, not direct database calls.");
      }
    }
    break;

  case "python":
    check("type-ignore", "type:\\s*ignore", "Fix the type error instead of ignoring it.");
    check("bare-except", "except\\s*:", "Catch specific exceptions, not bare except.");
    check("broad-except", "except\\s+Exception\\s*:", "Catch specific exceptions, not Exception.");
    check("bare-noqa", "# noqa$", "Use specific noqa code: # noqa: E501.");
    check("any-type", ":\\s*Any\\b", "Use a specific type instead of Any.");
    check("os-system", "os\\.system\\(", "Use subprocess.run() with list arguments.");
    check("eval", "eval\\(", "Never use eval().");
    break;

  case "go":
    check("err-discard", "_\\s*=\\s*err", "Handle the error or return it with context.");
    check("empty-interface", "interface\\{\\}", "Use 'any' keyword or generics (Go 1.18+).");
    check("bare-nolint", "//nolint$", "Add justification: //nolint:lintername // reason.");
    if (isEnabled("panic") && !isTestFile) {
      if (!/^package main$/m.test(content)) {
        check("panic", "panic\\(", "Return error instead of panicking.");
      }
    }
    break;

  case "rust":
    if (!isTestFile) {
      check("unwrap", "\\.unwrap\\(\\)", "Use ? operator or .expect('reason') instead of .unwrap().");
    }
    if (isEnabled("unsafe") && /unsafe\s*\{/.test(content)) {
      // Check for SAFETY comment on the line before unsafe
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (/unsafe\s*\{/.test(lines[i])) {
          const prev = i > 0 ? lines[i - 1] : "";
          if (!/\/\/\s*SAFETY:/.test(prev)) {
            violations.push("unsafe block without // SAFETY: comment. Add a SAFETY comment explaining the invariants.");
            break;
          }
        }
      }
    }
    break;

  case "cpp":
    if (/\.h$|\.hpp$/.test(base)) {
      check("using-namespace-std", "using namespace std",
        "Use std:: prefix in headers instead of 'using namespace std'.");
    }
    check("null-macro", "\\bNULL\\b", "Use nullptr instead of NULL.");
    check("define-const", "#define\\s+[A-Z_]+\\s+\\d", "Use constexpr instead of #define for constants.");
    break;

  case "swift":
    if (!isTestFile) {
      check("force-unwrap", "[^!]=.*[^?]!", "Use guard let, if let, or ?? instead of force unwrap (!).");
      check("force-cast", "\\bas!\\b", "Use 'as?' with optional binding instead of force cast 'as!'.");
      check("try-force", "\\btry!", "Use do/try/catch or try? instead of try!.");
    }
    break;

  case "kotlin":
    if (!isTestFile) {
      check("non-null-assert", "!!", "Use ?.let { }, ?:, or safe calls instead of !! assertion.");
      check("run-blocking", "\\brunBlocking\\b", "Use lifecycleScope.launch or viewModelScope.launch instead of runBlocking.");
      check("bare-return-async", "return@AsyncFunction\\s*$",
        "Use 'return@AsyncFunction null' — bare return sends Unit, Expo expects Any?.");
    }
    break;
}

// ──────────────────────────────────────────────────────────────────
// PHASE 2: Framework validation (config-driven rules)
// ──────────────────────────────────────────────────────────────────

const relPath = filePath.startsWith(projectDir + "/")
  ? filePath.slice(projectDir.length + 1)
  : base;

/**
 * Convert glob pattern to regex for file path matching.
 */
function globToRegex(pattern) {
  return pattern
    .replace(/\*\*/g, "__DBLSTAR__")
    .replace(/\./g, "\\.")
    .replace(/\*/g, "[^/]*")
    .replace(/__DBLSTAR__/g, ".*");
}

/**
 * Process a set of framework validation rule groups.
 * Returns group names processed (for dedup).
 */
function processFvGroups(fvJson, processedGroups) {
  if (!fvJson || typeof fvJson !== "object") return;

  for (const [groupName, group] of Object.entries(fvJson)) {
    if (processedGroups && processedGroups.has(groupName)) continue;

    const appliesTo = group.appliesTo || [];
    const matched = appliesTo.some((pattern) => {
      const regex = new RegExp(`^${globToRegex(pattern)}$`);
      return regex.test(relPath);
    });
    if (!matched) continue;

    const rules = group.rules || [];
    for (const rule of rules) {
      if (!rule.pattern || !rule.message) continue;

      const severity = rule.severity || "warn";

      // Check skipIf — if content matches skipIf, skip this rule
      if (rule.skipIf) {
        try {
          if (new RegExp(rule.skipIf, "m").test(content)) continue;
        } catch { /* invalid skipIf regex — skip the skip */ }
      }

      let ruleMatched = false;
      try {
        ruleMatched = new RegExp(rule.pattern, "m").test(content);
      } catch { continue; /* invalid regex */ }

      // invertMatch: violation is when pattern is NOT found
      if (rule.invertMatch === true || rule.invertMatch === "true") {
        ruleMatched = !ruleMatched;
      }

      if (ruleMatched) {
        const msg = `[${groupName}] ${rule.message}`;
        if (severity === "error") {
          violations.push(msg);
        } else {
          warnings.push(msg);
        }
      }
    }

    if (processedGroups) processedGroups.add(groupName);
  }
}

// ── Next.js content component check ─────────────────────────────
if (config.frameworks) {
  const hasNextjs = Object.values(config.frameworks).some(
    (f) => f?.frontend === "nextjs"
  );
  if (hasNextjs) {
    if (/^(app|src\/app)\/.*\.tsx$/.test(relPath)) {
      const validAppFiles = new Set([
        "page.tsx", "layout.tsx", "loading.tsx", "error.tsx",
        "not-found.tsx", "global-error.tsx", "template.tsx", "default.tsx",
        "opengraph-image.tsx", "twitter-image.tsx", "icon.tsx",
        "apple-icon.tsx", "sitemap.tsx", "robots.tsx", "manifest.tsx",
      ]);
      if (!validAppFiles.has(base)) {
        violations.push(
          `[nextjs-app-content] Content component '${base}' belongs in components/, not app/.`
        );
      }
    }
  }
}

// ── Layer 1: Plugin defaults ────────────────────────────────────
const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || "";
const defaultsDir = pluginRoot ? join(pluginRoot, "defaults") : "";
const pluginGroups = new Set();

function loadPluginRules(rulesFile) {
  if (!existsSync(rulesFile)) return;
  try {
    const data = JSON.parse(readFileSync(rulesFile, "utf8"));
    if (data.rules) {
      processFvGroups(data.rules, pluginGroups);
    }
  } catch { /* skip corrupt defaults files */ }
}

if (defaultsDir && existsSync(defaultsDir)) {
  // Always load shared rules
  loadPluginRules(join(defaultsDir, "shared.json"));

  // Load category rules based on detected stack
  if (config.frameworks) {
    const frontends = new Set();
    const backends = new Set();

    for (const fw of Object.values(config.frameworks)) {
      if (fw?.frontend && fw.frontend !== "null") frontends.add(fw.frontend);
      if (fw?.backend && fw.backend !== "null") backends.add(fw.backend);
    }

    if (frontends.size > 0) {
      // Load all frontend rules
      const feDir = join(defaultsDir, "frontend");
      if (existsSync(feDir)) {
        try {
          for (const f of readdirSync(feDir)) {
            if (f.endsWith(".json")) loadPluginRules(join(feDir, f));
          }
        } catch { /* skip */ }
      }
      // Load framework-specific fullstack/mobile rules
      if (frontends.has("nextjs")) loadPluginRules(join(defaultsDir, "fullstack", "nextjs.json"));
      if (frontends.has("expo")) loadPluginRules(join(defaultsDir, "mobile", "expo.json"));
    }

    for (const be of backends) {
      if (be === "supabase") loadPluginRules(join(defaultsDir, "backend", "supabase.json"));
    }

    // HTML framework
    if (config.frameworks.html) {
      loadPluginRules(join(defaultsDir, "vanilla.json"));
    }

    // SDK-specific rules
    const versionsStr = JSON.stringify(config.frameworks);
    if (/tanstack-query|@tanstack\/react-query/.test(versionsStr)) {
      loadPluginRules(join(defaultsDir, "sdks", "tanstack-query.json"));
    }
    if (/"zod"/.test(versionsStr)) {
      loadPluginRules(join(defaultsDir, "sdks", "zod.json"));
    }
  }
}

// ── Layer 2: Project-level rules ────────────────────────────────
if (config.frameworkValidation) {
  processFvGroups(config.frameworkValidation, pluginGroups);
}

// ──────────────────────────────────────────────────────────────────
// REPORT
// ──────────────────────────────────────────────────────────────────

if (violations.length > 0) {
  process.stderr.write(`BLOCKED: Fix before proceeding (${base}):\n`);
  for (const v of violations) process.stderr.write(`- ${v}\n`);

  if (lang === "typescript") {
    process.stderr.write("\nFix with:\n");
    process.stderr.write("  - satisfies operator for type validation without widening\n");
    process.stderr.write("  - Type guards (is/in/instanceof) to narrow unknown or union types\n");
    process.stderr.write("  - Generic type params: useLocalSearchParams<T>, ChangeEvent<T>, Ref<T>\n");
    process.stderr.write("  - Regenerate types if the schema changed\n");
    const typegenHint = config.typegenHint || "";
    if (typegenHint) {
      process.stderr.write(`  - Regen: ${typegenHint}\n`);
    }
  }

  if (warnings.length > 0) {
    process.stderr.write("\nWarnings (non-blocking):\n");
    for (const w of warnings) process.stderr.write(`- ${w}\n`);
  }

  // Escalation counter
  const sessionId = process.env.CLAUDE_SESSION_ID || "unknown";
  const counterFile = `/tmp/composure-enforcement-${sessionId}`;
  let vCount = 0;
  try {
    vCount = parseInt(readFileSync(counterFile, "utf8"), 10) || 0;
  } catch { /* first violation */ }
  vCount++;
  try {
    writeFileSync(counterFile, String(vCount));
  } catch { /* best effort */ }

  if (vCount >= 3) {
    process.stderr.write(
      `\nMANDATORY ESCALATION: ${vCount} violations this session. You MUST invoke /composure:app-architecture NOW to load framework reference docs before attempting any more edits.\n`
    );
  }

  // Activity counter: enforcement block
  try { appendFileSync(join(projectDir, ".composure", "hook-activity.log"), "enforcement\n"); } catch {}
  process.exit(2);
}

// Activity counter: check passed
try { appendFileSync(join(projectDir, ".composure", "hook-activity.log"), "check\n"); } catch {}

if (warnings.length > 0) {
  process.stderr.write(`Framework warnings in ${base} (non-blocking):\n`);
  for (const w of warnings) process.stderr.write(`- ${w}\n`);
}

process.exit(0);
