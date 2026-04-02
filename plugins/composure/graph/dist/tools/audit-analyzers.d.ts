/**
 * Audit analyzer functions extracted from run-audit.ts.
 *
 * Contains: shared constants, helpers, size recommendations,
 * file organization, test coverage, and security CLI analyzers.
 *
 * Cohesion analysis lives in audit-cohesion.ts (largest single analyzer).
 */
import { GraphStore } from "../store.js";
import type { FindingSeverity, RecommendedAction } from "../types.js";
export declare const IMPACTS: {
    FILE_400: number;
    FILE_600: number;
    FILE_800: number;
    FUNC_150: number;
    TASKS_PER_5: number;
    CVE_CRITICAL: number;
    CVE_HIGH: number;
    CVE_MODERATE: number;
    SEMGREP_ERROR: number;
    SEMGREP_WARNING: number;
    SEMGREP_INFO: number;
    MISSING_HEADER: number;
    UNTESTED_FUNC: number;
    PREFLIGHT_FAIL: number;
    PREFLIGHT_WARN: number;
    GRAB_BAG: number;
    MIXED_CONCERNS: number;
    INLINE_CANDIDATE: number;
    COLOCATE_CANDIDATE: number;
    MISPLACED_APP_CONTENT: number;
};
export declare function execSafe(cmd: string, args: string[], cwd: string): string | null;
export declare function findPkgManager(root: string): string | null;
export declare function toSeverity(raw: unknown): FindingSeverity;
export declare function recommendForSize(lines: number, threshold: number, kind: "file" | "function"): {
    recommendation: RecommendedAction;
    reason: string;
};
export declare function analyzeFileOrganization(store: GraphStore, runId: string, repoRoot: string): number;
export declare function analyzeTestCoverage(store: GraphStore, runId: string, repoRoot: string): number;
export declare function analyzeSecurityCLI(store: GraphStore, runId: string, repoRoot: string): number;
