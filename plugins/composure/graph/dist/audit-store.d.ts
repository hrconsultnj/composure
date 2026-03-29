/**
 * Audit-specific store operations.
 *
 * Separate module to keep store.ts under the decomposition limit.
 * All functions accept a GraphStore instance and operate on the
 * audit_findings, test_coverage, and audit_scores tables.
 */
import type { GraphStore } from "./store.js";
import type { AuditFinding, AuditFindingInfo, AuditScore, AuditScoreInfo, TestCoverage, TestCoverageInfo } from "./types.js";
export declare function insertFinding(store: GraphStore, f: AuditFindingInfo): number;
export declare function getFindings(store: GraphStore, runId: string, category?: string): AuditFinding[];
export declare function getFindingCounts(store: GraphStore, runId: string): Record<string, Record<string, number>>;
export declare function insertTestCoverage(store: GraphStore, tc: TestCoverageInfo): number;
export declare function getTestCoverage(store: GraphStore, runId: string): TestCoverage[];
export declare function getTestCoverageGaps(store: GraphStore, runId: string): TestCoverage[];
export declare function insertScore(store: GraphStore, s: AuditScoreInfo): number;
export declare function getScores(store: GraphStore, runId: string): AuditScore[];
export declare function getOverallScore(store: GraphStore, runId: string): {
    score: number;
    grade: string;
    color: string;
};
export declare function clearAuditRun(store: GraphStore, runId: string): void;
export declare function getLatestRunId(store: GraphStore): string | null;
export declare function gradeFor(score: number): {
    grade: string;
    color: string;
};
