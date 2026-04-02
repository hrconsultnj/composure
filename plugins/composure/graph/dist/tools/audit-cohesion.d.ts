/**
 * Cohesion analysis extracted from run-audit.ts.
 *
 * Detects structural code quality issues: grab-bag files, mixed concerns,
 * inline candidates, and co-locate candidates — all from graph SQL queries.
 */
import { GraphStore } from "../store.js";
export declare function analyzeCohesion(store: GraphStore, db: ReturnType<GraphStore["getDb"]>, runId: string, repoRoot: string): number;
