/**
 * Composure Enforcement Engine — core orchestrator.
 *
 * This module is the shared enforcement logic called by:
 *   - CLI (composure-enforce.mjs) — for hooks to call
 *   - MCP server — for hookless platforms
 *   - Direct import — for Node.js tools
 *
 * Hooks are the PRIMARY enforcement for Claude Code.
 * MCP is the COMPLEMENT for platforms without hooks.
 */

import { extname } from "node:path";
import { loadConfig, findProjectRoot } from "./config.js";
import { ALL_RULES, getRulesForLanguage } from "./rules/no-bandaids.js";
import { runFrameworkValidation } from "./rules/framework.js";
import { checkQuality as runQualityCheck } from "./rules/quality.js";
import {
  detectLanguage,
  isTestFile,
  DEFAULT_SKIP_PATTERNS,
  type Language,
  type Violation,
  type EnforcementResult,
  type ComposureConfig,
  type QualityReport,
} from "./types.js";

/**
 * Paths that should be skipped by enforcement — rule definition files
 * contain violation patterns in their string literals (false positives).
 */
const SELF_SKIP_PATTERNS = [
  /enforce\/src\/rules\//,
  /enforce\/src\/adapters\./,
  /enforce\/tests\/fixtures\//,
];

function isSelfSkipped(filePath: string): boolean {
  return SELF_SKIP_PATTERNS.some((p) => p.test(filePath));
}

/**
 * Run no-bandaids language rules against file content.
 */
export function validateCode(
  filePath: string,
  content: string,
  config?: ComposureConfig | null,
): EnforcementResult {
  // Skip enforcement engine's own source files (rule definitions contain violation patterns)
  if (isSelfSkipped(filePath)) {
    return { filePath, passed: true, violations: [], warnings: [] };
  }

  const violations: Violation[] = [];
  const warnings: Violation[] = [];

  const language = detectLanguage(filePath);
  if (!language) {
    return { filePath, passed: true, violations, warnings };
  }

  // Load config if not provided
  if (config === undefined) {
    const projectRoot = findProjectRoot(filePath);
    config = projectRoot ? loadConfig(projectRoot) : null;
  }

  // Check if language is in configured frameworks
  if (config?.frameworks) {
    if (!config.frameworks[language]) {
      // Language not in project stack — only enforce typescript by default
      if (language !== "typescript") {
        return { filePath, passed: true, violations, warnings };
      }
    }
  }

  // Check skip patterns
  const basename = filePath.split("/").pop() ?? "";
  const skipPatterns = config?.skipPatterns ?? DEFAULT_SKIP_PATTERNS;
  for (const pattern of skipPatterns) {
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
    );
    if (regex.test(basename)) {
      return { filePath, passed: true, violations, warnings };
    }
  }

  // Check disabled rules
  const disabledRules = new Set(config?.disabledRules ?? []);

  const testFile = isTestFile(filePath);
  const rules = getRulesForLanguage(language);

  for (const rule of rules) {
    // Skip disabled rules
    if (disabledRules.has(rule.name)) continue;

    // Test file filtering
    if (rule.testFileOnly && !testFile) continue;
    if (rule.nonTestOnly && testFile) continue;

    // Write-only rules need special handling
    if (rule.writeOnly) {
      // Supabase client query: only in 'use client' files
      if (rule.name === "supabase-client-query") {
        if (
          !content.includes("'use client'") &&
          !content.includes('"use client"')
        ) {
          continue;
        }
      }
    }

    // Special cases
    if (rule.name === "panic" && language === "go") {
      // Skip panic check in package main
      if (/^package main$/m.test(content)) continue;
    }

    if (rule.name === "unsafe" && language === "rust") {
      // Check for preceding // SAFETY: comment
      if (/\/\/ SAFETY:[\s\S]*?unsafe\s*\{/.test(content)) continue;
    }

    if (rule.name === "using-namespace-std" && language === "cpp") {
      // Only check in header files
      const ext = extname(filePath);
      if (ext !== ".h" && ext !== ".hpp") continue;
    }

    // Check skipIf
    if (rule.skipIf && rule.skipIf.test(content)) continue;

    // Run pattern match
    if (rule.pattern.test(content)) {
      const v: Violation = {
        rule: rule.name,
        severity: rule.severity,
        message: rule.message,
        source: "no-bandaids",
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
    warnings,
  };
}

/**
 * Run framework validation rules against file content.
 */
export function frameworkCheck(
  filePath: string,
  content: string,
  pluginRoot?: string | null,
): EnforcementResult {
  const projectRoot = findProjectRoot(filePath);
  const config = projectRoot ? loadConfig(projectRoot) : null;

  if (!config) {
    return { filePath, passed: true, violations: [], warnings: [] };
  }

  // Compute relative path
  const relativePath = projectRoot
    ? filePath.replace(projectRoot + "/", "")
    : filePath.split("/").pop() ?? "";

  const { violations, warnings } = runFrameworkValidation(
    filePath,
    relativePath,
    content,
    config,
    pluginRoot ?? null,
  );

  return {
    filePath,
    passed: violations.length === 0,
    violations,
    warnings,
  };
}

/**
 * Run quality / decomposition checks on a file.
 */
export function checkQuality(filePath: string): QualityReport | null {
  return runQualityCheck(filePath);
}

/**
 * Run ALL enforcement checks on a file in one call.
 */
export function validateAll(
  filePath: string,
  content: string,
  pluginRoot?: string | null,
): EnforcementResult {
  const codeResult = validateCode(filePath, content);
  const fwResult = frameworkCheck(filePath, content, pluginRoot);

  return {
    filePath,
    passed: codeResult.passed && fwResult.passed,
    violations: [...codeResult.violations, ...fwResult.violations],
    warnings: [...codeResult.warnings, ...fwResult.warnings],
  };
}

/**
 * Get the detected stack info from project config.
 */
export function getStack(
  projectDir?: string,
): { config: ComposureConfig | null; projectDir: string | null } {
  const dir = projectDir ?? findProjectRoot(process.cwd()) ?? process.cwd();
  const config = loadConfig(dir);
  return { config, projectDir: dir };
}

/**
 * Get all rules, optionally filtered by language.
 */
export function getRules(language?: string): {
  rules: Array<{ name: string; pattern: string; severity: string; message: string; languages: string[] }>;
} {
  const filtered = language
    ? getRulesForLanguage(language)
    : ALL_RULES;

  return {
    rules: filtered.map((r) => ({
      name: r.name,
      pattern: r.pattern.source,
      severity: r.severity,
      message: r.message,
      languages: r.languages,
    })),
  };
}
