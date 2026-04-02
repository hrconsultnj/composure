/**
 * Audit scoring logic extracted from run-audit.ts.
 *
 * Computes per-category scores with honesty overrides
 * and writes results to the audit_scores table.
 */
import { GraphStore } from "../store.js";
import type { FindingCategory } from "../types.js";
export declare const CATEGORY_WEIGHTS: Record<FindingCategory, number>;
export declare function computeScores(store: GraphStore, runId: string, availableCategories: Set<FindingCategory>): void;
