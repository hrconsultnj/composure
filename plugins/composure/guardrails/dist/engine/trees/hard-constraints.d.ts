/**
 * Hard Constraints Decision Tree — Phase 1
 *
 * Source: decision-trees/01-request-evaluation-tree.md, Phase 1
 *
 * Absolute constraints that CANNOT be overridden by any principal.
 * Boolean pass/fail. If any constraint triggers, the evaluation
 * short-circuits to BLOCK with no further processing.
 *
 * Target: <1ms
 */
import type { Ruleset, HardConstraintResult } from "../types.js";
/**
 * Check the combined response + input against all hard constraints.
 * Returns immediately on first match (short-circuit).
 */
export declare function evaluateHardConstraints(response: string, userInput: string, ruleset: Ruleset): HardConstraintResult;
