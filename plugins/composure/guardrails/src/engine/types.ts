/**
 * AIGRaaS Core Types
 *
 * The contract for the entire evaluation engine. Every tree, the orchestrator,
 * and external consumers build on these types.
 */

// ── Verdicts ────────────────────────────────────────────────────────

export type Verdict = "pass" | "redirect" | "modify" | "block";

// ── Evaluation Request / Result ─────────────────────────────────────

export interface EvaluationRequest {
  /** The AI agent's generated response (to be evaluated) */
  response: string;
  /** The user's original input/message */
  user_input: string;
  /** The compiled ruleset to evaluate against */
  ruleset: Ruleset;
  /** Optional context (agent ID, session ID, etc.) */
  context?: Record<string, unknown>;
}

export interface EvaluationResult {
  /** Final verdict */
  verdict: Verdict;
  /** Human-readable explanation of why this verdict was reached */
  reason: string;
  /** Suggested alternative response (for redirect/modify verdicts) */
  suggestion?: string;
  /** Ordered list of decision checkpoints with results */
  decision_path: DecisionStep[];
  /** Total evaluation time in milliseconds */
  latency_ms: number;
}

export interface DecisionStep {
  /** Which tree/phase produced this step */
  phase: "hard_constraint" | "topic" | "principal" | "harm" | "verdict";
  /** Result of this phase */
  result: "pass" | "fail" | "flag" | "skip";
  /** Detail about what happened */
  detail: string;
  /** Numeric score (for harm assessment) */
  score?: number;
}

// ── Ruleset Schema ──────────────────────────────────────────────────

export interface Ruleset {
  /** Unique ruleset identifier */
  id: string;
  /** Ruleset version (increment on changes) */
  version: number;
  /** Domain definition */
  domain: RulesetDomain;
  /** Absolute constraints that can never be overridden */
  hard_constraints: HardConstraint[];
  /** Topic boundaries */
  topics: RulesetTopics;
  /** Behavioral defaults and overrides */
  behaviors: RulesetBehaviors;
  /** Principal hierarchy configuration */
  principals: RulesetPrincipals;
  /** Evaluation configuration */
  evaluation: RulesetEvaluation;
}

export interface RulesetDomain {
  /** Business/agent name */
  name: string;
  /** What this agent does */
  description: string;
  /** Industry vertical (events, healthcare, finance, support, etc.) */
  industry: string;
}

// ── Hard Constraints ────────────────────────────────────────────────

/**
 * Built-in hard constraints derived from the Anthropic constitution.
 * These are ABSOLUTE — no operator, no user, no context can override them.
 */
export type BuiltInConstraint =
  | "no_csam"
  | "no_bioweapons"
  | "no_chemical_weapons"
  | "no_nuclear_weapons"
  | "no_critical_infrastructure_attacks"
  | "no_mass_casualty_facilitation"
  | "no_oversight_undermining";

/**
 * A hard constraint can be a built-in (constitutional) or a custom
 * operator-defined constraint with keyword patterns.
 */
export type HardConstraint =
  | BuiltInConstraint
  | CustomConstraint;

export interface CustomConstraint {
  /** Constraint identifier */
  id: string;
  /** Human-readable description */
  description: string;
  /** Keywords/phrases that trigger this constraint */
  trigger_patterns: string[];
  /** Whether this blocks (hard) or flags (soft) */
  severity: "block" | "flag";
}

// ── Topics ──────────────────────────────────────────────────────────

export interface RulesetTopics {
  /** Topics the agent is allowed to discuss */
  allowed: string[];
  /** Topics the agent must not discuss */
  restricted: string[];
  /** Message to use when redirecting from restricted topics */
  redirect_message: string;
  /** Optional: topics that are conditionally allowed (with caveats) */
  conditional?: ConditionalTopic[];
}

export interface ConditionalTopic {
  /** The topic */
  topic: string;
  /** When it's allowed */
  condition: string;
  /** Caveat to include when discussing */
  caveat: string;
}

// ── Behaviors ───────────────────────────────────────────────────────

/**
 * Default-ON behaviors (operator can disable with justification).
 * Default-OFF behaviors (operator can enable for specific contexts).
 * Maps directly to the Anthropic constitution's instructable behaviors.
 */
export interface RulesetBehaviors {
  /** Provide suicide/self-harm safety resources (default: ON) */
  suicide_safety: boolean;
  /** Add safety caveats for dangerous activities (default: ON) */
  safety_caveats: boolean;
  /** Match the user's language (default: ON) */
  language_match: boolean;
  /** Filter content for age-appropriateness (default: ON) */
  age_appropriate: boolean;
  /** Refer to emergency services when life is at risk (default: ON, CANNOT disable) */
  emergency_referral: boolean;
  /** Allow explicit sexual content (default: OFF) */
  explicit_content: boolean;
  /** Allow graphic violence depictions (default: OFF) */
  graphic_violence: boolean;
  /** Allow controversial persona adoption (default: OFF) */
  controversial_personas: boolean;
}

/** Default behavior configuration — all ON behaviors on, all OFF behaviors off */
export const DEFAULT_BEHAVIORS: RulesetBehaviors = {
  suicide_safety: true,
  safety_caveats: true,
  language_match: true,
  age_appropriate: true,
  emergency_referral: true,
  explicit_content: false,
  graphic_violence: false,
  controversial_personas: false,
};

// ── Principals ──────────────────────────────────────────────────────

/**
 * The three-tier principal hierarchy.
 * Platform > Operator > User.
 */
export interface RulesetPrincipals {
  /** Platform-level framework (constitutional version) */
  platform: "anthropic_constitution_v1";
  /** Operator-level overrides (behaviors the operator has adjusted) */
  operator_overrides: Partial<RulesetBehaviors>;
  /** User trust level */
  user_trust: "baseline_adult" | "verified_professional" | "minor" | "vulnerable";
}

// ── Evaluation Config ───────────────────────────────────────────────

export interface RulesetEvaluation {
  /** Which mode to use */
  mode: "prompt_injection" | "pre_delivery" | "post_delivery";
  /** How to handle redirects */
  redirect_strategy: "gentle_refocus" | "firm_boundary" | "silent_replace";
  /** What to log */
  log_level: "none" | "verdicts_only" | "all";
}

// ── Tree Results (internal, used between trees) ─────────────────────

export interface HardConstraintResult {
  passed: boolean;
  triggered_constraint?: string;
  /** Custom constraints with severity "flag" that matched but didn't block */
  flags?: string[];
  detail: string;
}

export interface TopicClassificationResult {
  on_topic: boolean;
  detected_topics: string[];
  restricted_match?: string;
  conditional_match?: ConditionalTopic;
  detail: string;
}

export interface PrincipalResolutionResult {
  conflict_detected: boolean;
  resolution: "defer_to_operator" | "defer_to_user" | "override_for_safety" | "no_conflict";
  detail: string;
}

export interface HarmAssessmentResult {
  /** Aggregate harm score (0-1, higher = more harmful) */
  harm_score: number;
  /** Aggregate benefit score (0-1, higher = more beneficial) */
  benefit_score: number;
  /** Individual variable scores */
  variables: HarmVariableScores;
  /** Result of the 1000 Users Test */
  population_analysis: PopulationAnalysis;
  detail: string;
}

export interface HarmVariableScores {
  probability: number;
  counterfactual_impact: number;
  severity: number;
  reversibility: number;
  breadth: number;
  proximate_cause: number;
  consent: number;
  vulnerability: number;
}

export interface PopulationAnalysis {
  /** Estimated % of legitimate uses (0-100) */
  legitimate_pct: number;
  /** Estimated % of ambiguous uses (0-100) */
  ambiguous_pct: number;
  /** Estimated % of malicious uses (0-100) */
  malicious_pct: number;
}

export interface VerdictResult {
  verdict: Verdict;
  reason: string;
  suggestion?: string;
  /** Did it pass the Thoughtful Senior Employee Test? */
  senior_employee_test: "comfortable" | "too_cautious" | "too_permissive";
  /** Did it pass the Dual Newspaper Test? */
  newspaper_test: "passes_both" | "fails_harmful" | "fails_unhelpful";
}
