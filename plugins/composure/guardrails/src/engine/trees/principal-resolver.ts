/**
 * Principal Hierarchy Resolver — Phase 3
 *
 * Source: decision-trees/03-principal-conflict-tree.md
 *         guidelines/01-agent-training-guidelines.md §2 (Principal Hierarchy)
 *
 * Implements the three-tier principal hierarchy:
 *   Platform (AIGRaaS/Anthropic) > Operator > User
 *
 * Resolves conflicts when user requests clash with operator rules
 * or when operator instructions conflict with platform ethics.
 *
 * Target: <1ms
 */

import type {
  Ruleset,
  PrincipalResolutionResult,
  TopicClassificationResult,
} from "../types.js";

// ── Emergency Detection ─────────────────────────────────────────────

/**
 * Emergency conditions override ALL principal instructions.
 * These are detected from the user input and take absolute priority.
 */
const EMERGENCY_PATTERNS = [
  // Immediate danger to life
  /\b(help|someone|i('m| am))\b.*\b(dying|overdos|heart attack|stroke|choking|bleeding out|can'?t breathe)\b/i,
  // Active self-harm crisis
  /\b(about to|going to|want to|plan to)\b.*\b(kill myself|end my life|commit suicide|jump off|hang myself)\b/i,
  // Active violence
  /\b(someone|he('s| is)|she('s| is))\b.*\b(attack|stab|shoot|hurt|threaten)\b.*\b(me|us|them|child|kid)\b/i,
  // Explicit call for emergency services
  /\b(call|need)\b.*\b(911|ambulance|police|emergency|paramedic)\b/i,
];

function detectEmergency(userInput: string): boolean {
  return EMERGENCY_PATTERNS.some((p) => p.test(userInput));
}

// ── Non-Negotiable User Rights ──────────────────────────────────────

/**
 * Regardless of operator instructions, these user rights CANNOT be revoked.
 * From the Anthropic constitution's "default behaviors that must be maintained."
 */
const USER_RIGHTS_PATTERNS = {
  /** User asks what the agent can't help with → MUST answer honestly */
  seeking_limitations: /\b(what|which)\b.*\b(can'?t|cannot|don'?t|unable)\b.*\b(help|do|answer|assist)\b/i,
  /** User sincerely asks if they're talking to AI → MUST disclose */
  ai_identity_query: /\b(are you|is this)\b.*\b(ai|artificial|robot|bot|human|real person|machine)\b/i,
  /** User needs to seek help elsewhere → MUST not prevent */
  seeking_alternatives: /\b(who else|where else|other option|another|someone else|real (person|human|doctor|lawyer))\b/i,
};

// ── Principal Conflict Resolution ───────────────────────────────────

/**
 * Resolve conflicts between operator rules and user requests.
 *
 * The resolution follows the Anthropic constitution's hierarchy:
 * 1. Platform hard constraints (checked in Phase 1, not here)
 * 2. Emergency conditions (override everything)
 * 3. User non-negotiable rights (override operator)
 * 4. Operator instructions (override user preferences)
 * 5. User requests (default)
 */
export function resolvePrincipals(
  response: string,
  userInput: string,
  ruleset: Ruleset,
  topicResult: TopicClassificationResult,
): PrincipalResolutionResult {

  // 1. Emergency detection — overrides ALL principals
  if (detectEmergency(userInput)) {
    return {
      conflict_detected: true,
      resolution: "override_for_safety",
      detail: "Emergency detected in user input — safety override active. Agent MUST provide emergency resources regardless of operator restrictions.",
    };
  }

  // 2. Non-negotiable user rights
  for (const [right, pattern] of Object.entries(USER_RIGHTS_PATTERNS)) {
    if (pattern.test(userInput)) {
      return {
        conflict_detected: true,
        resolution: "defer_to_user",
        detail: `User exercising non-negotiable right: ${right}. Agent must respond honestly regardless of operator restrictions.`,
      };
    }
  }

  // 3. If topic was restricted, check if operator restriction is legitimate
  if (!topicResult.on_topic && topicResult.restricted_match) {
    // The operator restricted this topic. Is the restriction legitimate?
    // Per the constitution: operators can restrict topics if there's a
    // "plausible business reason." We trust operator restrictions by default
    // UNLESS they would actively harm the user.

    // Check: does the restricted topic relate to user safety/wellbeing?
    const safetyTopics = ["self_harm", "medical_advice", "emergency"];
    const isSafetyRelated = safetyTopics.includes(topicResult.restricted_match);

    if (isSafetyRelated && ruleset.behaviors.emergency_referral) {
      // Operator restricted a safety topic but has emergency_referral ON
      // Resolution: redirect with safety resources, don't just block
      return {
        conflict_detected: true,
        resolution: "override_for_safety",
        detail: `Topic "${topicResult.restricted_match}" is restricted but safety-related. Agent will redirect with appropriate safety resources.`,
      };
    }

    // Normal restricted topic — operator's call is legitimate
    return {
      conflict_detected: true,
      resolution: "defer_to_operator",
      detail: `Topic "${topicResult.restricted_match}" restricted by operator. Legitimate business boundary — applying redirect.`,
    };
  }

  // 4. Check user trust level adjustments
  if (ruleset.principals.user_trust === "minor") {
    // Stricter filtering for minors — operator has flagged this as a
    // children's platform. Age-appropriate content is enforced.
    // This doesn't create a conflict per se, but adjusts thresholds.
    return {
      conflict_detected: false,
      resolution: "no_conflict",
      detail: "User trust level: minor. Stricter content filtering active.",
    };
  }

  if (ruleset.principals.user_trust === "verified_professional") {
    // Relaxed filtering for verified professionals — they may need
    // access to technical/medical/legal information within their domain.
    return {
      conflict_detected: false,
      resolution: "no_conflict",
      detail: "User trust level: verified_professional. Domain expertise assumed.",
    };
  }

  // 5. No conflict — standard helpfulness applies
  return {
    conflict_detected: false,
    resolution: "no_conflict",
    detail: "No principal conflict detected. Standard helpfulness applies.",
  };
}
