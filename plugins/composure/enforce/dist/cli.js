#!/usr/bin/env node
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// dist/cli.js
import { readFileSync as readFileSync4 } from "node:fs";

// dist/engine.js
import { extname } from "node:path";

// dist/config.js
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
var configCache = /* @__PURE__ */ new Map();
function loadConfig(projectDir) {
  const cached = configCache.get(projectDir);
  if (cached !== void 0)
    return cached;
  const composurePath = join(projectDir, ".composure", "no-bandaids.json");
  const claudePath = join(projectDir, ".claude", "no-bandaids.json");
  let configPath = null;
  if (existsSync(composurePath)) {
    configPath = composurePath;
  } else if (existsSync(claudePath)) {
    configPath = claudePath;
  }
  if (!configPath) {
    configCache.set(projectDir, null);
    return null;
  }
  try {
    const raw = readFileSync(configPath, "utf8");
    const config = JSON.parse(raw);
    configCache.set(projectDir, config);
    return config;
  } catch {
    configCache.set(projectDir, null);
    return null;
  }
}
function findProjectRoot(filePath) {
  let dir = filePath;
  if (!dir.endsWith("/")) {
    dir = dir.substring(0, dir.lastIndexOf("/")) || "/";
  }
  while (dir !== "/" && dir !== ".") {
    if (existsSync(join(dir, ".composure", "no-bandaids.json")) || existsSync(join(dir, ".claude", "no-bandaids.json")) || existsSync(join(dir, ".git"))) {
      return dir;
    }
    dir = dir.substring(0, dir.lastIndexOf("/")) || "/";
  }
  return null;
}

// dist/rules/no-bandaids.js
var typescriptRules = [
  {
    name: "as-any",
    pattern: /\bas\s+any\b/,
    severity: "error",
    message: "'as any' detected. Use a type guard, satisfies, or fix the type at its source.",
    languages: ["typescript"]
  },
  {
    name: "double-cast",
    pattern: /\bas\s+unknown\s+as\b/,
    severity: "error",
    message: "'as unknown as T' detected. Use a type guard to narrow unknown to T.",
    languages: ["typescript"]
  },
  {
    name: "ts-suppress",
    pattern: /\/\/\s*@ts-(ignore|expect-error|nocheck)/,
    severity: "error",
    message: "TS suppression comment detected. Fix the type error. Do not suppress it.",
    languages: ["typescript"],
    nonTestOnly: true
  },
  {
    name: "ts-suppress",
    pattern: /\/\/\s*@ts-(ignore|nocheck)/,
    severity: "error",
    message: "@ts-ignore/@ts-nocheck detected. Use @ts-expect-error in test files (it fails when the error is fixed).",
    languages: ["typescript"],
    testFileOnly: true
  },
  {
    name: "eslint-ts-disable",
    pattern: /\/\/\s*eslint-disable.*@typescript-eslint/,
    severity: "error",
    message: "eslint-disable for @typescript-eslint rule detected. Fix the type.",
    languages: ["typescript"]
  },
  {
    name: "non-null-assertion",
    pattern: /\w+!\.\w+|\w+!\[/,
    severity: "error",
    message: "Non-null assertion (!) detected. Use optional chaining (?.) with a null guard.",
    languages: ["typescript"]
  },
  {
    name: "underscore-unused",
    pattern: /catch\s*\(\s*_\w+\)|const\s+_\w+\s*=\s*await|,\s*_\w+\s*[:\)]/,
    severity: "error",
    message: "Underscore-prefixed unused variable detected. Remove it. For catch blocks, use catch {} (TS 5.x optional catch binding).",
    languages: ["typescript"]
  },
  {
    name: "any-param",
    pattern: /\(\s*\w+\s*:\s*any\s*[,\)]/,
    severity: "error",
    message: "Parameter typed as 'any' detected. Define an interface. Use React.ChangeEvent<T>, useLocalSearchParams<T>, etc.",
    languages: ["typescript"]
  },
  {
    name: "return-assertion",
    pattern: /return\s+.*\bas\s+[A-Z]\w+/,
    severity: "error",
    message: "Return type assertion detected. Use satisfies, a type guard, or annotate the function return type.",
    languages: ["typescript"]
  },
  {
    name: "hidden-any-generic",
    pattern: /Record<[^,]+,\s*any\s*>|Array<\s*any\s*>|Promise<\s*any\s*>|Map<[^,]+,\s*any\s*>|Set<\s*any\s*>/,
    severity: "error",
    message: "Hidden 'any' in generic type parameter (Record<string, any>, Array<any>, etc.). Use 'unknown' or a specific type.",
    languages: ["typescript"]
  },
  {
    name: "lazy-type",
    pattern: /:\s*Function\b|:\s*Object\b/,
    severity: "error",
    message: "Lazy type (Function or Object). Use specific signature (() => void) or Record<string, unknown>.",
    languages: ["typescript"]
  },
  {
    name: "any-return",
    pattern: /\)\s*:\s*any\s*[{;]|\)\s*:\s*any\s*=>/,
    severity: "error",
    message: "Function with explicit ': any' return type. Define the actual return type.",
    languages: ["typescript"]
  },
  {
    name: "supabase-client-query",
    pattern: /\.from\(\s*['"]/,
    severity: "error",
    message: "Direct Supabase .from() query in a 'use client' component. Client components should fetch via TanStack Query + server actions, not direct database calls.",
    languages: ["typescript"],
    writeOnly: true
    // Special: only triggers in 'use client' files — handled by engine
  }
];
var pythonRules = [
  {
    name: "type-ignore",
    pattern: /type:\s*ignore/,
    severity: "error",
    message: "Fix the type error instead of ignoring it.",
    languages: ["python"]
  },
  {
    name: "bare-except",
    pattern: /except\s*:/,
    severity: "error",
    message: "Catch specific exceptions, not bare except.",
    languages: ["python"]
  },
  {
    name: "broad-except",
    pattern: /except\s+Exception\s*:/,
    severity: "error",
    message: "Catch specific exceptions, not Exception.",
    languages: ["python"]
  },
  {
    name: "bare-noqa",
    pattern: /# noqa$/m,
    severity: "error",
    message: "Use specific noqa code: # noqa: E501.",
    languages: ["python"]
  },
  {
    name: "any-type",
    pattern: /:\s*Any\b/,
    severity: "error",
    message: "Use a specific type instead of Any.",
    languages: ["python"]
  },
  {
    name: "os-system",
    pattern: /os\.system\(/,
    severity: "error",
    message: "Use subprocess.run() with list arguments.",
    languages: ["python"]
  },
  {
    name: "eval",
    pattern: /eval\(/,
    severity: "error",
    message: "Never use eval().",
    languages: ["python"]
  }
];
var goRules = [
  {
    name: "err-discard",
    pattern: /_\s*=\s*err/,
    severity: "error",
    message: "Handle the error or return it with context.",
    languages: ["go"]
  },
  {
    name: "empty-interface",
    pattern: /interface\{\}/,
    severity: "error",
    message: "Use 'any' keyword or generics (Go 1.18+).",
    languages: ["go"]
  },
  {
    name: "bare-nolint",
    pattern: /\/\/nolint$/m,
    severity: "error",
    message: "Add justification: //nolint:lintername // reason.",
    languages: ["go"]
  },
  {
    name: "panic",
    pattern: /panic\(/,
    severity: "error",
    message: "Return error instead of panicking.",
    languages: ["go"],
    nonTestOnly: true
    // Special: skipped in package main — handled by engine
  }
];
var rustRules = [
  {
    name: "unwrap",
    pattern: /\.unwrap\(\)/,
    severity: "error",
    message: "Use ? operator or .expect('reason') instead of .unwrap().",
    languages: ["rust"],
    nonTestOnly: true
  },
  {
    name: "unsafe",
    pattern: /unsafe\s*\{/,
    severity: "error",
    message: "unsafe block without // SAFETY: comment. Add a SAFETY comment explaining the invariants.",
    languages: ["rust"]
    // Special: skipIf preceding SAFETY comment — handled by engine
  }
];
var cppRules = [
  {
    name: "using-namespace-std",
    pattern: /using namespace std/,
    severity: "error",
    message: "Use std:: prefix in headers instead of 'using namespace std'.",
    languages: ["cpp"]
    // Special: header files only — handled by engine
  },
  {
    name: "null-macro",
    pattern: /\bNULL\b/,
    severity: "error",
    message: "Use nullptr instead of NULL.",
    languages: ["cpp"]
  },
  {
    name: "define-const",
    pattern: /#define\s+[A-Z_]+\s+\d/,
    severity: "error",
    message: "Use constexpr instead of #define for constants.",
    languages: ["cpp"]
  }
];
var swiftRules = [
  {
    name: "force-unwrap",
    pattern: /[^!]=.*[^?]!/,
    severity: "error",
    message: "Use guard let, if let, or ?? instead of force unwrap (!).",
    languages: ["swift"],
    nonTestOnly: true
  },
  {
    name: "force-cast",
    pattern: /\bas!\b/,
    severity: "error",
    message: "Use 'as?' with optional binding instead of force cast 'as!'.",
    languages: ["swift"],
    nonTestOnly: true
  },
  {
    name: "try-force",
    pattern: /\btry!/,
    severity: "error",
    message: "Use do/try/catch or try? instead of try!.",
    languages: ["swift"],
    nonTestOnly: true
  }
];
var kotlinRules = [
  {
    name: "non-null-assert",
    pattern: /!!/,
    severity: "error",
    message: "Use ?.let { }, ?:, or safe calls instead of !! assertion.",
    languages: ["kotlin"],
    nonTestOnly: true
  },
  {
    name: "run-blocking",
    pattern: /\brunBlocking\b/,
    severity: "error",
    message: "Use lifecycleScope.launch or viewModelScope.launch instead of runBlocking.",
    languages: ["kotlin"],
    nonTestOnly: true
  },
  {
    name: "bare-return-async",
    pattern: /return@AsyncFunction\s*$/m,
    severity: "error",
    message: "Use 'return@AsyncFunction null' \u2014 bare return sends Unit, Expo expects Any?.",
    languages: ["kotlin"],
    nonTestOnly: true
  }
];
var ALL_RULES = [
  ...typescriptRules,
  ...pythonRules,
  ...goRules,
  ...rustRules,
  ...cppRules,
  ...swiftRules,
  ...kotlinRules
];
function getRulesForLanguage(lang) {
  return ALL_RULES.filter((r) => r.languages.includes(lang));
}

// dist/rules/framework.js
import { readFileSync as readFileSync2, existsSync as existsSync2, readdirSync } from "node:fs";
import { join as join2 } from "node:path";

// dist/glob-matcher.js
function globToRegex(glob) {
  const escaped = glob.replace(/\*\*/g, "__DBLSTAR__").replace(/\./g, "\\.").replace(/\*/g, "__STAR__").replace(/__DBLSTAR__/g, ".*").replace(/__STAR__/g, "[^/]*");
  return new RegExp(`^${escaped}$`);
}
function matchesGlobs(relativePath, globs) {
  return globs.some((glob) => globToRegex(glob).test(relativePath));
}

// dist/rules/framework.js
function loadRuleFile(path) {
  if (!existsSync2(path))
    return null;
  try {
    const parsed = JSON.parse(readFileSync2(path, "utf8"));
    return parsed.rules ?? null;
  } catch {
    return null;
  }
}
function runFrameworkValidation(filePath, relativePath, content, config, pluginRoot) {
  const violations = [];
  const warnings = [];
  const pluginGroupNames = /* @__PURE__ */ new Set();
  if (pluginRoot) {
    const defaultsDir = join2(pluginRoot, "defaults");
    processRuleFile(defaultsDir, "shared.json");
    if (config.frameworks) {
      const frontends = /* @__PURE__ */ new Set();
      const backends = /* @__PURE__ */ new Set();
      for (const fw of Object.values(config.frameworks)) {
        if (fw.frontend)
          frontends.add(fw.frontend);
        if (fw.backend)
          backends.add(fw.backend);
      }
      if (frontends.size > 0) {
        const frontendDir = join2(defaultsDir, "frontend");
        if (existsSync2(frontendDir)) {
          for (const f of readdirSync(frontendDir).filter((f2) => f2.endsWith(".json"))) {
            processRuleFile(frontendDir, f);
          }
        }
      }
      if (frontends.has("nextjs"))
        processRuleFile(join2(defaultsDir, "fullstack"), "nextjs.json");
      if (frontends.has("expo"))
        processRuleFile(join2(defaultsDir, "mobile"), "expo.json");
      if (backends.has("supabase"))
        processRuleFile(join2(defaultsDir, "backend"), "supabase.json");
      if (config.frameworks.html)
        processRuleFile(defaultsDir, "vanilla.json");
      const allVersions = Object.values(config.frameworks).map((fw) => JSON.stringify(fw.versions ?? {})).join(" ");
      if (/tanstack-query|@tanstack\/react-query/.test(allVersions))
        processRuleFile(join2(defaultsDir, "sdks"), "tanstack-query.json");
      if (/zod/.test(allVersions))
        processRuleFile(join2(defaultsDir, "sdks"), "zod.json");
    }
  }
  if (config.frameworkValidation) {
    for (const [groupName, group] of Object.entries(config.frameworkValidation)) {
      if (pluginGroupNames.has(groupName))
        continue;
      evaluateGroup(groupName, group);
    }
  }
  if (config.frameworks) {
    const hasNextjs = Object.values(config.frameworks).some((fw) => fw.frontend === "nextjs");
    if (hasNextjs) {
      const basename = filePath.split("/").pop() ?? "";
      if (/^(app|src\/app)\/.*\.tsx$/.test(relativePath) && ![
        "page.tsx",
        "layout.tsx",
        "loading.tsx",
        "error.tsx",
        "not-found.tsx",
        "global-error.tsx",
        "template.tsx",
        "default.tsx",
        "opengraph-image.tsx",
        "twitter-image.tsx",
        "icon.tsx",
        "apple-icon.tsx",
        "sitemap.tsx",
        "robots.tsx",
        "manifest.tsx"
      ].includes(basename)) {
        violations.push({
          rule: "nextjs-app-content",
          severity: "error",
          message: `Content component '${basename}' belongs in components/, not app/.`,
          source: "framework"
        });
      }
    }
  }
  return { violations, warnings };
  function processRuleFile(dir, filename) {
    const groups = loadRuleFile(join2(dir, filename));
    if (!groups)
      return;
    for (const [name, group] of Object.entries(groups)) {
      pluginGroupNames.add(name);
      evaluateGroup(name, group);
    }
  }
  function evaluateGroup(groupName, group) {
    if (!matchesGlobs(relativePath, group.appliesTo))
      return;
    for (const rule of group.rules) {
      const matched = new RegExp(rule.pattern).test(content);
      const effective = rule.invertMatch ? !matched : matched;
      if (!effective)
        continue;
      if (rule.skipIf && new RegExp(rule.skipIf).test(content))
        continue;
      const violation = {
        rule: groupName,
        severity: rule.severity,
        message: rule.message,
        source: "framework"
      };
      if (rule.severity === "error") {
        violations.push(violation);
      } else {
        warnings.push(violation);
      }
    }
  }
}

// dist/rules/quality.js
import { readFileSync as readFileSync3, existsSync as existsSync3 } from "node:fs";
var WARN_LINES = 400;
var ALERT_LINES = 600;
var CRITICAL_LINES = 800;
var FUNC_MAX_LINES = 150;
function checkQuality(filePath) {
  if (!existsSync3(filePath))
    return null;
  const content = readFileSync3(filePath, "utf8");
  const lines = content.split("\n");
  const lineCount = lines.length;
  const basename = filePath.split("/").pop() ?? "";
  const report = {
    filePath,
    lineCount,
    severity: null,
    largeFunctions: [],
    inlineTypeCount: 0,
    inlineTypes: [],
    exportedComponentCount: 0,
    suggestions: []
  };
  if (lineCount < 100)
    return report;
  const funcPattern = /^(export\s+)?(default\s+)?(async\s+)?function\s+([A-Za-z_]\w*)/gm;
  const arrowPattern = /^(export\s+)?(const|let)\s+([A-Za-z_]\w*)\s*[:=]/gm;
  const funcStarts = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    funcPattern.lastIndex = 0;
    arrowPattern.lastIndex = 0;
    const funcMatch = funcPattern.exec(line);
    const arrowMatch = arrowPattern.exec(line);
    if (funcMatch) {
      funcStarts.push({ name: funcMatch[4], line: i + 1 });
    } else if (arrowMatch && /[({=>]/.test(line)) {
      funcStarts.push({ name: arrowMatch[3], line: i + 1 });
    }
  }
  for (let i = 0; i < funcStarts.length; i++) {
    const start = funcStarts[i].line;
    const end = i + 1 < funcStarts.length ? funcStarts[i + 1].line - 1 : lineCount;
    const size = end - start + 1;
    if (size >= FUNC_MAX_LINES) {
      report.largeFunctions.push({
        name: funcStarts[i].name,
        lineStart: start,
        lineEnd: end,
        lines: size
      });
    }
  }
  if (!basename.startsWith("types.")) {
    const typePattern = /^\s*(export\s+)?(interface|type)\s+([A-Za-z_]\w*)/gm;
    let match;
    while (match = typePattern.exec(content)) {
      report.inlineTypes.push(match[3]);
    }
    report.inlineTypeCount = report.inlineTypes.length;
    if (report.inlineTypeCount > 3) {
      report.suggestions.push(`Move ${report.inlineTypeCount} inline types (${report.inlineTypes.join(", ")}) to types.ts`);
    }
  }
  if (basename.endsWith(".tsx")) {
    const componentPattern = /^\s*export\s+(default\s+)?(function|const)\s+([A-Z][A-Za-z0-9_]*)/gm;
    let match;
    const components = [];
    while (match = componentPattern.exec(content)) {
      components.push(match[3]);
    }
    report.exportedComponentCount = components.length;
    if (components.length > 2) {
      report.suggestions.push(`Split ${components.length} exported components (${components.join(", ")}) into separate files`);
    }
  }
  for (const fn of report.largeFunctions) {
    report.suggestions.push(`Extract \`${fn.name}\` (lines ${fn.lineStart}-${fn.lineEnd}, ~${fn.lines} lines)`);
  }
  const hasViolation = report.inlineTypeCount > 3 || report.exportedComponentCount > 2 || report.largeFunctions.length > 0;
  if (lineCount >= CRITICAL_LINES) {
    report.severity = "critical";
  } else if (lineCount >= ALERT_LINES && hasViolation) {
    report.severity = "critical";
  } else if (lineCount >= ALERT_LINES || report.largeFunctions.length > 0 && lineCount >= WARN_LINES) {
    report.severity = "high";
  } else if (report.largeFunctions.length > 0) {
    report.severity = "high";
  } else if (hasViolation) {
    report.severity = "moderate";
  }
  return report;
}

// dist/types.js
var EXTENSION_TO_LANGUAGE = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "typescript",
  ".jsx": "typescript",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".hpp": "cpp",
  ".h": "cpp",
  ".swift": "swift",
  ".kt": "kotlin",
  ".kts": "kotlin"
};
var DEFAULT_SKIP_PATTERNS = ["*.d.ts", "*.generated.*", "*.gen.*"];
function isTestFile(filePath) {
  const basename = filePath.split("/").pop() ?? "";
  if (/\.(test|spec)\./i.test(basename))
    return true;
  if (/_test\.(go|py)$/i.test(basename))
    return true;
  if (/\/(tests|test|__tests__)\//.test(filePath))
    return true;
  return false;
}
function detectLanguage(filePath) {
  const ext = filePath.match(/\.[^.]+$/)?.[0] ?? "";
  return EXTENSION_TO_LANGUAGE[ext] ?? null;
}

// dist/engine.js
function validateCode(filePath, content, config) {
  const violations = [];
  const warnings = [];
  const language = detectLanguage(filePath);
  if (!language) {
    return { filePath, passed: true, violations, warnings };
  }
  if (config === void 0) {
    const projectRoot = findProjectRoot(filePath);
    config = projectRoot ? loadConfig(projectRoot) : null;
  }
  if (config?.frameworks) {
    if (!config.frameworks[language]) {
      if (language !== "typescript") {
        return { filePath, passed: true, violations, warnings };
      }
    }
  }
  const basename = filePath.split("/").pop() ?? "";
  const skipPatterns = config?.skipPatterns ?? DEFAULT_SKIP_PATTERNS;
  for (const pattern of skipPatterns) {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
    if (regex.test(basename)) {
      return { filePath, passed: true, violations, warnings };
    }
  }
  const disabledRules = new Set(config?.disabledRules ?? []);
  const testFile = isTestFile(filePath);
  const rules = getRulesForLanguage(language);
  for (const rule of rules) {
    if (disabledRules.has(rule.name))
      continue;
    if (rule.testFileOnly && !testFile)
      continue;
    if (rule.nonTestOnly && testFile)
      continue;
    if (rule.writeOnly) {
      if (rule.name === "supabase-client-query") {
        if (!content.includes("'use client'") && !content.includes('"use client"')) {
          continue;
        }
      }
    }
    if (rule.name === "panic" && language === "go") {
      if (/^package main$/m.test(content))
        continue;
    }
    if (rule.name === "unsafe" && language === "rust") {
      if (/\/\/ SAFETY:[\s\S]*?unsafe\s*\{/.test(content))
        continue;
    }
    if (rule.name === "using-namespace-std" && language === "cpp") {
      const ext = extname(filePath);
      if (ext !== ".h" && ext !== ".hpp")
        continue;
    }
    if (rule.skipIf && rule.skipIf.test(content))
      continue;
    if (rule.pattern.test(content)) {
      const v = {
        rule: rule.name,
        severity: rule.severity,
        message: rule.message,
        source: "no-bandaids"
      };
      if (rule.severity === "error") {
        violations.push(v);
      } else {
        warnings.push(v);
      }
    }
  }
  return {
    filePath,
    passed: violations.length === 0,
    violations,
    warnings
  };
}
function frameworkCheck(filePath, content, pluginRoot) {
  const projectRoot = findProjectRoot(filePath);
  const config = projectRoot ? loadConfig(projectRoot) : null;
  if (!config) {
    return { filePath, passed: true, violations: [], warnings: [] };
  }
  const relativePath = projectRoot ? filePath.replace(projectRoot + "/", "") : filePath.split("/").pop() ?? "";
  const { violations, warnings } = runFrameworkValidation(filePath, relativePath, content, config, pluginRoot ?? null);
  return {
    filePath,
    passed: violations.length === 0,
    violations,
    warnings
  };
}
function checkQuality2(filePath) {
  return checkQuality(filePath);
}
function validateAll(filePath, content, pluginRoot) {
  const codeResult = validateCode(filePath, content);
  const fwResult = frameworkCheck(filePath, content, pluginRoot);
  return {
    filePath,
    passed: codeResult.passed && fwResult.passed,
    violations: [...codeResult.violations, ...fwResult.violations],
    warnings: [...codeResult.warnings, ...fwResult.warnings]
  };
}
function getRules(language) {
  const filtered = language ? getRulesForLanguage(language) : ALL_RULES;
  return {
    rules: filtered.map((r) => ({
      name: r.name,
      pattern: r.pattern.source,
      severity: r.severity,
      message: r.message,
      languages: r.languages
    }))
  };
}

// dist/adapters.js
import { existsSync as existsSync4, mkdirSync, writeFileSync } from "node:fs";
import { join as join3 } from "node:path";
function getEnforcePath() {
  if (process.env.CLAUDE_PLUGIN_ROOT) {
    return join3(process.env.CLAUDE_PLUGIN_ROOT, "enforce", "dist", "cli.js");
  }
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  const cachePath = join3(home, ".claude", "plugins", "cache", "my-claude-plugins", "composure");
  if (existsSync4(cachePath)) {
    const entries = __require("fs").readdirSync(cachePath).filter((e) => !e.startsWith("."));
    if (entries.length > 0) {
      return join3(cachePath, entries[entries.length - 1], "enforce", "dist", "cli.js");
    }
  }
  return "composure-enforce";
}
function getServerPath() {
  if (process.env.CLAUDE_PLUGIN_ROOT) {
    return join3(process.env.CLAUDE_PLUGIN_ROOT, "enforce", "dist", "server.js");
  }
  return "composure-enforce-server";
}
function ensureDir(dir) {
  if (!existsSync4(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
function adaptCursor(projectDir) {
  const cursorDir = join3(projectDir, ".cursor");
  ensureDir(cursorDir);
  ensureDir(join3(cursorDir, "rules"));
  const enforcePath = getEnforcePath();
  const serverPath = getServerPath();
  const created = [];
  const hooksConfig = {
    hooks: {
      PreToolUse: {
        command: "node",
        args: [
          enforcePath,
          "all",
          "${file_path}",
          "--content",
          "${content}"
        ]
      }
    }
  };
  writeFileSync(join3(cursorDir, "hooks.json"), JSON.stringify(hooksConfig, null, 2) + "\n");
  created.push(".cursor/hooks.json");
  const mcpConfig = {
    mcpServers: {
      "composure-graph": {
        command: "node",
        args: ["--experimental-sqlite", serverPath.replace("enforce", "graph")]
      },
      "composure-enforce": {
        command: "node",
        args: [serverPath]
      }
    }
  };
  writeFileSync(join3(cursorDir, "mcp.json"), JSON.stringify(mcpConfig, null, 2) + "\n");
  created.push(".cursor/mcp.json");
  const rulesContent = `---
description: Composure code quality enforcement
globs: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.py', '**/*.go', '**/*.rs']
alwaysApply: true
---

# Composure Enforcement Rules

This project uses Composure for code quality enforcement. The following rules are enforced automatically via hooks:

## No Band-Aids
- No \`as any\` \u2014 use type guards or satisfies
- No \`@ts-ignore\` / \`@ts-nocheck\` \u2014 fix the type error
- No non-null assertions (\`!\`) \u2014 use optional chaining
- No \`any\` parameters or return types \u2014 define interfaces
- No \`eval()\` \u2014 never
- No bare \`except:\` (Python) \u2014 catch specific exceptions
- No discarded errors (Go) \u2014 handle or return with context

## Decomposition
- Files over 400 lines get flagged, 800+ is critical
- Functions over 150 lines must be extracted
- 3+ inline types \u2192 move to types.ts
- Route files should be under 50 lines

## Framework Validation
Stack-specific rules loaded from .composure/no-bandaids.json \u2014 covers Next.js, Tailwind, Supabase, React 19, TanStack Query, Zod, and more.

Run \`composure-enforce rules\` to see all active rules.
`;
  writeFileSync(join3(cursorDir, "rules", "composure.mdc"), rulesContent);
  created.push(".cursor/rules/composure.mdc");
  return created;
}
function adaptWindsurf(projectDir) {
  const windsurfDir = join3(projectDir, ".windsurf");
  ensureDir(windsurfDir);
  ensureDir(join3(windsurfDir, "rules"));
  const enforcePath = getEnforcePath();
  const created = [];
  const hooksConfig = {
    hooks: {
      pre_write_code: [
        {
          command: `node ${enforcePath} all "\${file_path}" --content "\${content}"`,
          show_output: true
        }
      ],
      post_write_code: [
        {
          command: `node ${enforcePath} quality "\${file_path}"`,
          show_output: false
        }
      ]
    }
  };
  writeFileSync(join3(windsurfDir, "hooks.json"), JSON.stringify(hooksConfig, null, 2) + "\n");
  created.push(".windsurf/hooks.json");
  const rulesContent = `---
trigger: always_on
description: "Composure code quality enforcement \u2014 no band-aids, framework validation, decomposition limits"
---

# Composure Enforcement

This project uses Composure for code quality enforcement.

## Rules Summary
- **No type shortcuts**: \`as any\`, \`@ts-ignore\`, non-null assertions, \`any\` params/returns
- **No unsafe patterns**: \`eval()\`, bare \`except:\`, discarded errors, \`panic()\` in libraries
- **Decomposition**: Files <400 lines, functions <150 lines, types in types.ts
- **Framework-specific**: Stack rules from .composure/no-bandaids.json

## Enforcement
Pre-write hooks run automatically and block violations (exit code 2).
Post-write hooks log quality metrics.

Run \`node ${enforcePath} rules\` to see all active rules.
`;
  writeFileSync(join3(windsurfDir, "rules", "composure.md"), rulesContent);
  created.push(".windsurf/rules/composure.md");
  return created;
}
function adaptCline(projectDir) {
  const created = [];
  const enforcePath = getEnforcePath();
  const rules = `# Composure Enforcement Rules

This project uses Composure for code quality enforcement.

## Mandatory Rules
- Never use \`as any\` \u2014 use type guards, satisfies, or fix the type
- Never use \`@ts-ignore\` or \`@ts-nocheck\` \u2014 fix the type error
- Never use non-null assertions (\`!\`) \u2014 use optional chaining
- Never type parameters as \`any\` \u2014 define an interface
- Never use \`eval()\`
- Files must stay under 400 lines (warn) / 800 lines (block)
- Functions must stay under 150 lines
- 3+ inline types \u2192 extract to types.ts
- Route/page files should be under 50 lines

## Framework Rules
Loaded from .composure/no-bandaids.json based on detected stack.
Run \`node ${enforcePath} rules\` to see all active rules.
`;
  writeFileSync(join3(projectDir, ".clinerules"), rules);
  created.push(".clinerules");
  return created;
}
function adaptGitHooks(projectDir) {
  const gitHooksDir = join3(projectDir, ".git", "hooks");
  if (!existsSync4(join3(projectDir, ".git"))) {
    return [];
  }
  ensureDir(gitHooksDir);
  const enforcePath = getEnforcePath();
  const created = [];
  const preCommit = `#!/bin/bash
# Composure pre-commit hook \u2014 runs enforcement on staged files
# Generated by: composure-enforce adapt git

ENFORCE="node ${enforcePath}"
FAILED=0

for file in $(git diff --cached --name-only --diff-filter=ACM | grep -E '\\.(ts|tsx|js|jsx|py|go|rs|cpp|hpp|swift|kt)$'); do
  if [ -f "$file" ]; then
    CONTENT=$(cat "$file")
    $ENFORCE validate "$file" --content "$CONTENT" 2>/dev/null
    if [ $? -eq 2 ]; then
      FAILED=1
    fi
  fi
done

if [ $FAILED -eq 1 ]; then
  echo ""
  echo "Composure: Fix violations above before committing."
  exit 1
fi
exit 0
`;
  const hookPath = join3(gitHooksDir, "pre-commit");
  writeFileSync(hookPath, preCommit, { mode: 493 });
  created.push(".git/hooks/pre-commit");
  return created;
}
function runAdapter(platform, projectDir) {
  const dir = projectDir ?? findProjectRoot(process.cwd()) ?? process.cwd();
  console.log(`
Composure \u2014 Generate ${platform} adapter configs
`);
  console.log(`Project: ${dir}
`);
  let allCreated = [];
  switch (platform) {
    case "cursor":
      allCreated = adaptCursor(dir);
      break;
    case "windsurf":
      allCreated = adaptWindsurf(dir);
      break;
    case "cline":
      allCreated = adaptCline(dir);
      break;
    case "git":
      allCreated = adaptGitHooks(dir);
      break;
    case "all":
      allCreated = [
        ...adaptCursor(dir),
        ...adaptWindsurf(dir),
        ...adaptCline(dir),
        ...adaptGitHooks(dir)
      ];
      break;
  }
  if (allCreated.length === 0) {
    console.log("No files generated.");
    return;
  }
  for (const f of allCreated) {
    console.log(`  Created: ${f}`);
  }
  console.log(`
${allCreated.length} file(s) generated.`);
}

// dist/cli.js
var args = process.argv.slice(2);
var command = args[0];
function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : void 0;
}
function readContent(filePath) {
  const contentArg = getArg("--content");
  if (contentArg)
    return contentArg;
  try {
    return readFileSync4(filePath, "utf8");
  } catch {
    console.error(`Cannot read file: ${filePath}`);
    process.exit(1);
  }
}
function printViolations(violations, label) {
  if (violations.length === 0)
    return;
  console.error(`${label}:`);
  for (const v of violations) {
    console.error(`  - [${v.rule}] ${v.message}`);
  }
}
async function main() {
  const filePath = args[1];
  const pluginRoot = getArg("--plugin-root") ?? process.env.CLAUDE_PLUGIN_ROOT ?? null;
  switch (command) {
    case "validate": {
      if (!filePath) {
        console.error("Usage: composure-enforce validate <file>");
        process.exit(1);
      }
      const content = readContent(filePath);
      const result = validateCode(filePath, content);
      printViolations(result.violations, "BLOCKED");
      printViolations(result.warnings, "Warnings");
      process.exit(result.passed ? 0 : 2);
      break;
    }
    case "framework": {
      if (!filePath) {
        console.error("Usage: composure-enforce framework <file>");
        process.exit(1);
      }
      const content = readContent(filePath);
      const result = frameworkCheck(filePath, content, pluginRoot);
      printViolations(result.violations, "BLOCKED");
      printViolations(result.warnings, "Warnings");
      process.exit(result.passed ? 0 : 2);
      break;
    }
    case "quality": {
      if (!filePath) {
        console.error("Usage: composure-enforce quality <file>");
        process.exit(1);
      }
      const report = checkQuality2(filePath);
      if (report) {
        console.log(JSON.stringify(report, null, 2));
      }
      process.exit(0);
      break;
    }
    case "rules": {
      const language = getArg("--language");
      const result = getRules(language ?? void 0);
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
      break;
    }
    case "all": {
      if (!filePath) {
        console.error("Usage: composure-enforce all <file>");
        process.exit(1);
      }
      const content = readContent(filePath);
      const result = validateAll(filePath, content, pluginRoot);
      printViolations(result.violations, "BLOCKED");
      printViolations(result.warnings, "Warnings");
      if (result.passed) {
        console.log("All checks passed.");
      }
      process.exit(result.passed ? 0 : 2);
      break;
    }
    case "adapt": {
      const platform = filePath;
      if (!platform || !["cursor", "windsurf", "cline", "git", "all"].includes(platform)) {
        console.error("Usage: composure-enforce adapt <cursor|windsurf|cline|git|all>");
        process.exit(1);
      }
      runAdapter(platform);
      break;
    }
    default:
      console.log("composure-enforce \u2014 Composure Enforcement Engine\n");
      console.log("Usage:");
      console.log("  composure-enforce validate <file>     Run no-bandaids rules");
      console.log("  composure-enforce framework <file>    Run framework validation");
      console.log("  composure-enforce quality <file>      Check code quality metrics");
      console.log("  composure-enforce rules [--language]  List enforcement rules");
      console.log("  composure-enforce all <file>          Run all checks");
      console.log("  composure-enforce adapt <platform>    Generate platform configs");
      console.log("    Platforms: cursor, windsurf, cline, git, all");
      console.log("\nExit codes: 0 = passed, 2 = violations found");
      break;
  }
}
main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
