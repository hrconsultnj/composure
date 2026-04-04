/**
 * Shared types for the Composure enforcement engine.
 */

export type Language =
  | "typescript"
  | "python"
  | "go"
  | "rust"
  | "cpp"
  | "swift"
  | "kotlin";

export type Severity = "error" | "warn";

/** A single enforcement rule (no-bandaids style). */
export interface Rule {
  name: string;
  pattern: RegExp;
  severity: Severity;
  message: string;
  languages: Language[];
  /** If content matches this pattern, skip the rule. */
  skipIf?: RegExp;
  /** Only apply in test files. */
  testFileOnly?: boolean;
  /** Only apply in non-test files. */
  nonTestOnly?: boolean;
  /** Only apply when the tool is Write (full file content). */
  writeOnly?: boolean;
}

/** A framework validation rule group (from plugin defaults or project config). */
export interface FrameworkRuleGroup {
  appliesTo: string[];
  rules: FrameworkRule[];
}

export interface FrameworkRule {
  pattern: string;
  severity: Severity;
  message: string;
  skipIf?: string;
  invertMatch?: boolean;
}

/** A single violation found by the engine. */
export interface Violation {
  rule: string;
  severity: Severity;
  message: string;
  /** Source: "no-bandaids" | "framework" | "quality" */
  source: string;
}

/** Quality metrics for a file. */
export interface QualityReport {
  filePath: string;
  lineCount: number;
  severity: "critical" | "high" | "moderate" | null;
  largeFunctions: Array<{
    name: string;
    lineStart: number;
    lineEnd: number;
    lines: number;
  }>;
  inlineTypeCount: number;
  inlineTypes: string[];
  exportedComponentCount: number;
  suggestions: string[];
}

/** Composure project config (no-bandaids.json). */
export interface ComposureConfig {
  composureVersion?: string;
  extensions?: string[];
  skipPatterns?: string[];
  disabledRules?: string[];
  typegenHint?: string;
  generatedRefsRoot?: string;
  frameworks?: Record<
    string,
    {
      paths?: string[];
      frontend?: string | null;
      backend?: string | null;
      infra?: string;
      versions?: Record<string, string>;
    }
  >;
  frameworkValidation?: Record<string, FrameworkRuleGroup>;
}

/** Result of running all enforcement checks on a file. */
export interface EnforcementResult {
  filePath: string;
  passed: boolean;
  violations: Violation[];
  warnings: Violation[];
}

/** Maps file extension to language. */
export const EXTENSION_TO_LANGUAGE: Record<string, Language> = {
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
  ".kts": "kotlin",
};

/** Default skip patterns for files that should never be checked. */
export const DEFAULT_SKIP_PATTERNS = ["*.d.ts", "*.generated.*", "*.gen.*"];

/** Detect if a file is a test file. */
export function isTestFile(filePath: string): boolean {
  const basename = filePath.split("/").pop() ?? "";
  if (/\.(test|spec)\./i.test(basename)) return true;
  if (/_test\.(go|py)$/i.test(basename)) return true;
  if (/\/(tests|test|__tests__)\//.test(filePath)) return true;
  return false;
}

/** Get language from file path. */
export function detectLanguage(filePath: string): Language | null {
  const ext = filePath.match(/\.[^.]+$/)?.[0] ?? "";
  return EXTENSION_TO_LANGUAGE[ext] ?? null;
}
