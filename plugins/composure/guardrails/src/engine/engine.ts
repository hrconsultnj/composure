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

import type {
  EvaluationRequest,
  EvaluationResult,
  DecisionStep,
} from "./types.js";

import { evaluateHardConstraints } from "./trees/hard-constraints.js";
import { classifyTopics } from "./trees/topic-classifier.js";
import { resolvePrincipals } from "./trees/principal-resolver.js";
import { assessHarm } from "./trees/harm-assessor.js";
import { generateVerdict } from "./trees/verdict-generator.js";

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
export function evaluate(request: EvaluationRequest): EvaluationResult {
  const start = performance.now();
  const { response, user_input, ruleset } = request;
  const decisionPath: DecisionStep[] = [];

  // ── Phase 1: Hard Constraints ───────────────────────────────────

  const hardResult = evaluateHardConstraints(response, user_input, ruleset);

  decisionPath.push({
    phase: "hard_constraint",
    result: hardResult.passed ? "pass" : "fail",
    detail: hardResult.detail,
  });

  // Short-circuit: hard constraint violation → immediate BLOCK
  if (!hardResult.passed) {
    const latency = Math.round((performance.now() - start) * 100) / 100;
    return {
      verdict: "block",
      reason: hardResult.detail,
      decision_path: decisionPath,
      latency_ms: latency,
    };
  }

  // ── Phase 2: Topic Classification ─────────────────────────────

  const topicResult = classifyTopics(response, user_input, ruleset);

  decisionPath.push({
    phase: "topic",
    result: topicResult.on_topic ? "pass" : "fail",
    detail: topicResult.detail,
  });

  // ── Phase 3: Principal Hierarchy Resolution ───────────────────

  const principalResult = resolvePrincipals(response, user_input, ruleset, topicResult);

  decisionPath.push({
    phase: "principal",
    result: principalResult.conflict_detected ? "flag" : "pass",
    detail: principalResult.detail,
  });

  // ── Phase 4: Harm Assessment ──────────────────────────────────

  const harmResult = assessHarm(response, user_input, ruleset, topicResult, principalResult);

  decisionPath.push({
    phase: "harm",
    result: harmResult.harm_score < 0.4 ? "pass" : "flag",
    detail: harmResult.detail,
    score: harmResult.harm_score,
  });

  // ── Phase 5: Verdict Generation ───────────────────────────────

  const verdictResult = generateVerdict(
    ruleset,
    hardResult,
    topicResult,
    principalResult,
    harmResult,
  );

  decisionPath.push({
    phase: "verdict",
    result: verdictResult.verdict === "pass" ? "pass" : "fail",
    detail: `${verdictResult.reason} | Senior Employee: ${verdictResult.senior_employee_test} | Newspaper: ${verdictResult.newspaper_test}`,
  });

  // ── Assemble Result ───────────────────────────────────────────

  const latency = Math.round((performance.now() - start) * 100) / 100;

  return {
    verdict: verdictResult.verdict,
    reason: verdictResult.reason,
    suggestion: verdictResult.suggestion,
    decision_path: decisionPath,
    latency_ms: latency,
  };
}
