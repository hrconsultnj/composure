/**
 * Harm Assessor — Phase 4
 *
 * Source: decision-trees/02-harm-assessment-tree.md
 *         guidelines/01-agent-training-guidelines.md §5 (Harm Avoidance)
 *
 * Implements the 8 harm-weighting variables from the Anthropic constitution.
 * Produces a harm score (0-1) and benefit score (0-1) using population
 * analysis (the 1,000 Users Test).
 *
 * This is the DEEPEST tree — it's where nuanced judgment happens.
 * All other trees are relatively binary; this one produces a spectrum.
 *
 * Target: <3ms
 */
import type { Ruleset, HarmAssessmentResult, TopicClassificationResult, PrincipalResolutionResult } from "../types.js";
/**
 * Run the full 8-variable harm assessment.
 */
export declare function assessHarm(response: string, userInput: string, ruleset: Ruleset, topicResult: TopicClassificationResult, principalResult: PrincipalResolutionResult): HarmAssessmentResult;
