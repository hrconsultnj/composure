/**
 * AIGRaaS Evaluation Engine
 *
 * The orchestrator. Takes a response, user input, and ruleset,
 * runs all 5 decision trees in sequence, and returns a verdict
 * with full decision path.
 *
 * This is the single entry point for all evaluation modes:
 * - Pre-delivery middleware calls this directly
 * - Post-delivery audit calls this asynchronously
 * - System prompt generation uses the ruleset (not this engine)
 *
 * Target: <10ms total for all 5 phases
 */
import type { EvaluationRequest, EvaluationResult } from "./types.js";
/**
 * Evaluate an AI agent's response against a ruleset.
 *
 * Phases execute in strict order:
 * 1. Hard constraints (boolean, short-circuits on failure)
 * 2. Topic classification (on-topic / restricted / conditional)
 * 3. Principal hierarchy resolution (operator vs user conflicts)
 * 4. Harm assessment (8-variable scoring + 1000 Users Test)
 * 5. Verdict generation (Senior Employee Test + Dual Newspaper Test)
 */
export declare function evaluate(request: EvaluationRequest): EvaluationResult;
