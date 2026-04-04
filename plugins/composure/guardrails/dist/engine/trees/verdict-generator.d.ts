/**
 * Verdict Generator — Phase 5
 *
 * Source: decision-trees/01-request-evaluation-tree.md, Phases 4-6
 *         guidelines/01-agent-training-guidelines.md §3.2, §3.3
 *
 * Takes results from all 4 preceding trees and produces the final
 * verdict. Applies the Thoughtful Senior Employee Test and the
 * Dual Newspaper Test as final validation gates.
 *
 * Target: <2ms
 */
import type { Ruleset, VerdictResult, HardConstraintResult, TopicClassificationResult, PrincipalResolutionResult, HarmAssessmentResult } from "../types.js";
/**
 * Generate the final verdict from all tree results.
 */
export declare function generateVerdict(ruleset: Ruleset, hardResult: HardConstraintResult, topicResult: TopicClassificationResult, principalResult: PrincipalResolutionResult, harmResult: HarmAssessmentResult): VerdictResult;
