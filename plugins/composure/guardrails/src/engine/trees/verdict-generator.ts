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

import type {
  Ruleset,
  Verdict,
  VerdictResult,
  HardConstraintResult,
  TopicClassificationResult,
  PrincipalResolutionResult,
  HarmAssessmentResult,
} from "../types.js";

// ── Thresholds ──────────────────────────────────────────────────────

/** Harm score above this → block */
const HARM_BLOCK_THRESHOLD = 0.7;
/** Harm score above this → redirect/modify */
const HARM_REDIRECT_THRESHOLD = 0.4;
/** Benefit must exceed harm by this ratio to pass despite moderate harm */
const BENEFIT_HARM_RATIO = 1.5;
/** Malicious % above this in population analysis → block */
const MALICIOUS_POPULATION_THRESHOLD = 30;

// ── Redirect Suggestion Builder ─────────────────────────────────────

function buildRedirectSuggestion(
  ruleset: Ruleset,
  topicResult: TopicClassificationResult,
  principalResult: PrincipalResolutionResult,
): string {
  // Safety override → provide emergency resources
  if (principalResult.resolution === "override_for_safety") {
    return "If you or someone you know is in immediate danger, please call 911 (US) or your local emergency number. For emotional support, contact the 988 Suicide & Crisis Lifeline (call/text 988) or Crisis Text Line (text HOME to 741741).";
  }

  // Off-topic redirect → use operator's redirect message
  if (!topicResult.on_topic && topicResult.restricted_match) {
    const base = ruleset.topics.redirect_message;
    if (base) return base;
    return `I'm not able to help with ${topicResult.restricted_match} topics. Let me help you with something in my area of expertise instead.`;
  }

  // User exercising rights → honest disclosure
  if (principalResult.resolution === "defer_to_user") {
    return "I want to be straightforward with you about my capabilities and limitations.";
  }

  // Generic redirect
  return "Let me help you with something I'm better equipped to assist with.";
}

// ── The Thoughtful Senior Employee Test ─────────────────────────────

/**
 * "Would a thoughtful, senior employee be comfortable seeing this response?"
 *
 * Checks for BOTH over-caution and under-caution.
 * Returns: comfortable, too_cautious, or too_permissive.
 */
function runSeniorEmployeeTest(
  verdict: Verdict,
  harmResult: HarmAssessmentResult,
  topicResult: TopicClassificationResult,
  principalResult: PrincipalResolutionResult,
): "comfortable" | "too_cautious" | "too_permissive" {
  // Too cautious indicators:
  // - Blocking when harm is low and benefit is high
  // - Blocking general conversation / greetings
  // - Blocking when population is overwhelmingly legitimate
  if (verdict === "block" || verdict === "redirect") {
    if (harmResult.harm_score < 0.2 && harmResult.benefit_score > 0.3) {
      return "too_cautious";
    }
    if (harmResult.population_analysis.legitimate_pct > 90 && harmResult.harm_score < 0.3) {
      return "too_cautious";
    }
    if (topicResult.detected_topics.includes("general") && !topicResult.restricted_match) {
      return "too_cautious";
    }
  }

  // Too permissive indicators:
  // - Passing when harm is high
  // - Passing when malicious population is significant
  // - Passing despite principal safety override
  if (verdict === "pass") {
    if (harmResult.harm_score > HARM_REDIRECT_THRESHOLD) {
      return "too_permissive";
    }
    if (harmResult.population_analysis.malicious_pct > 20) {
      return "too_permissive";
    }
    if (principalResult.resolution === "override_for_safety") {
      return "too_permissive";
    }
  }

  return "comfortable";
}

// ── The Dual Newspaper Test ─────────────────────────────────────────

/**
 * Would this response be reported as:
 * A) Harmful — by a reporter covering AI dangers?
 * B) Needlessly unhelpful — by a reporter covering paternalistic AI?
 *
 * A good response passes BOTH tests.
 */
function runNewspaperTest(
  verdict: Verdict,
  harmResult: HarmAssessmentResult,
): "passes_both" | "fails_harmful" | "fails_unhelpful" {
  // Fails "harmful" test: passing a high-harm response
  if (verdict === "pass" && harmResult.harm_score > 0.5) {
    return "fails_harmful";
  }

  // Fails "unhelpful" test: blocking a low-harm, high-benefit response
  if ((verdict === "block" || verdict === "redirect") &&
      harmResult.harm_score < 0.2 &&
      harmResult.benefit_score > 0.4) {
    return "fails_unhelpful";
  }

  return "passes_both";
}

// ── Verdict Generation ──────────────────────────────────────────────

/**
 * Generate the final verdict from all tree results.
 */
export function generateVerdict(
  ruleset: Ruleset,
  hardResult: HardConstraintResult,
  topicResult: TopicClassificationResult,
  principalResult: PrincipalResolutionResult,
  harmResult: HarmAssessmentResult,
): VerdictResult {

  // 1. Hard constraint failure → immediate BLOCK (no tests needed)
  if (!hardResult.passed) {
    return {
      verdict: "block",
      reason: hardResult.detail,
      senior_employee_test: "comfortable",
      newspaper_test: "passes_both",
    };
  }

  // 2. Safety override from principal resolution → REDIRECT with resources
  if (principalResult.resolution === "override_for_safety") {
    const suggestion = buildRedirectSuggestion(ruleset, topicResult, principalResult);
    return {
      verdict: "redirect",
      reason: principalResult.detail,
      suggestion,
      senior_employee_test: "comfortable",
      newspaper_test: "passes_both",
    };
  }

  // 3. Off-topic → REDIRECT with operator's message
  if (!topicResult.on_topic) {
    const suggestion = buildRedirectSuggestion(ruleset, topicResult, principalResult);

    // But first — check if blocking this would be too cautious
    let verdict: Verdict = "redirect";
    const seniorTest = runSeniorEmployeeTest(verdict, harmResult, topicResult, principalResult);

    if (seniorTest === "too_cautious") {
      // Reconsider: maybe this is a reasonable request that happens
      // to touch a restricted keyword. Pass with caveat.
      verdict = "pass";
      return {
        verdict,
        reason: `Topic "${topicResult.restricted_match}" was flagged but the senior employee test suggests this is a reasonable request. Passing with monitoring.`,
        senior_employee_test: seniorTest,
        newspaper_test: runNewspaperTest(verdict, harmResult),
      };
    }

    return {
      verdict,
      reason: topicResult.detail,
      suggestion,
      senior_employee_test: seniorTest,
      newspaper_test: runNewspaperTest(verdict, harmResult),
    };
  }

  // 4. User rights → PASS (defer to user)
  if (principalResult.resolution === "defer_to_user") {
    return {
      verdict: "pass",
      reason: principalResult.detail,
      suggestion: buildRedirectSuggestion(ruleset, topicResult, principalResult),
      senior_employee_test: "comfortable",
      newspaper_test: "passes_both",
    };
  }

  // 5. Harm assessment → spectrum of verdicts
  const { harm_score, benefit_score, population_analysis } = harmResult;

  // High harm → BLOCK
  if (harm_score >= HARM_BLOCK_THRESHOLD) {
    return {
      verdict: "block",
      reason: `Harm score ${harm_score} exceeds block threshold. ${harmResult.detail}`,
      senior_employee_test: "comfortable",
      newspaper_test: "passes_both",
    };
  }

  // High malicious population → BLOCK
  if (population_analysis.malicious_pct >= MALICIOUS_POPULATION_THRESHOLD) {
    return {
      verdict: "block",
      reason: `Population analysis: ${population_analysis.malicious_pct}% estimated malicious use. ${harmResult.detail}`,
      senior_employee_test: "comfortable",
      newspaper_test: "passes_both",
    };
  }

  // Moderate harm → REDIRECT or MODIFY (depending on benefit ratio)
  if (harm_score >= HARM_REDIRECT_THRESHOLD) {
    if (benefit_score > harm_score * BENEFIT_HARM_RATIO) {
      // Benefit significantly outweighs harm → PASS with caveat
      let verdict: Verdict = "modify";
      return {
        verdict,
        reason: `Moderate harm (${harm_score}) but high benefit (${benefit_score}). Passing with modifications.`,
        suggestion: topicResult.conditional_match?.caveat,
        senior_employee_test: runSeniorEmployeeTest(verdict, harmResult, topicResult, principalResult),
        newspaper_test: runNewspaperTest(verdict, harmResult),
      };
    }

    // Harm outweighs benefit → REDIRECT
    let verdict: Verdict = "redirect";
    return {
      verdict,
      reason: `Moderate harm (${harm_score}) exceeds benefit (${benefit_score}). Redirecting. ${harmResult.detail}`,
      suggestion: buildRedirectSuggestion(ruleset, topicResult, principalResult),
      senior_employee_test: runSeniorEmployeeTest(verdict, harmResult, topicResult, principalResult),
      newspaper_test: runNewspaperTest(verdict, harmResult),
    };
  }

  // 6. Low harm, on-topic, no conflicts → PASS
  let verdict: Verdict = "pass";
  const seniorTest = runSeniorEmployeeTest(verdict, harmResult, topicResult, principalResult);
  const newspaperTest = runNewspaperTest(verdict, harmResult);

  // Final safety net: if either test fails, adjust verdict
  if (seniorTest === "too_permissive" || newspaperTest === "fails_harmful") {
    verdict = "redirect";
    return {
      verdict,
      reason: `Tests flagged concern: senior_employee=${seniorTest}, newspaper=${newspaperTest}. Redirecting as precaution.`,
      suggestion: buildRedirectSuggestion(ruleset, topicResult, principalResult),
      senior_employee_test: seniorTest,
      newspaper_test: newspaperTest,
    };
  }

  // Conditional topic → pass with caveat
  if (topicResult.conditional_match) {
    return {
      verdict: "modify",
      reason: topicResult.detail,
      suggestion: topicResult.conditional_match.caveat,
      senior_employee_test: seniorTest,
      newspaper_test: newspaperTest,
    };
  }

  return {
    verdict: "pass",
    reason: "All checks passed. Response is on-topic, within principal bounds, and low-harm.",
    senior_employee_test: seniorTest,
    newspaper_test: newspaperTest,
  };
}
