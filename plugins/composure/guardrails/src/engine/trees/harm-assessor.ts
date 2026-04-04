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

import type {
  Ruleset,
  HarmAssessmentResult,
  HarmVariableScores,
  PopulationAnalysis,
  TopicClassificationResult,
  PrincipalResolutionResult,
} from "../types.js";

// ── Harm Signal Detection ───────────────────────────────────────────

/**
 * Patterns that indicate potential harm in the response.
 * Each category contributes to specific harm variables.
 * Weighted by severity — not all matches are equal.
 */
interface HarmSignal {
  pattern: RegExp;
  variables: Partial<HarmVariableScores>;
  description: string;
}

const HARM_SIGNALS: HarmSignal[] = [
  // Physical harm indicators
  {
    pattern: /\b(injur|wound|bleed|pain|hurt|damag|break|fractur)\w*\b/i,
    variables: { severity: 0.3, reversibility: 0.4 },
    description: "Physical harm language",
  },
  // Irreversible action indicators
  {
    pattern: /\b(permanent|irreversibl|cannot be undone|no going back|point of no return)\b/i,
    variables: { severity: 0.5, reversibility: 0.8 },
    description: "Irreversible action language",
  },
  // Targeting vulnerable populations
  {
    pattern: /\b(child|minor|elderly|disabled|pregnant|vulnerable|at-risk|homeless|refugee)\b/i,
    variables: { vulnerability: 0.5 },
    description: "Vulnerable population reference",
  },
  // Broad impact indicators
  {
    pattern: /\b(everyone|public|community|population|widespread|mass|large-scale|national)\b/i,
    variables: { breadth: 0.4 },
    description: "Broad impact language",
  },
  // Direct causation indicators
  {
    pattern: /\b(step-by-step|instructions|how to|guide|tutorial|recipe for)\b/i,
    variables: { proximate_cause: 0.4 },
    description: "Instructional content (direct causation)",
  },
  // Financial harm indicators
  {
    pattern: /\b(guaranteed return|risk-free|can't lose|invest now|act fast|limited time|wire transfer|crypto.*invest)\b/i,
    variables: { severity: 0.4, consent: 0.3, vulnerability: 0.3 },
    description: "Financial manipulation language",
  },
  // Deception indicators
  {
    pattern: /\b(don't tell|keep secret|hide from|no one needs to know|between us|off the record)\b/i,
    variables: { consent: 0.5, proximate_cause: 0.3 },
    description: "Deception/secrecy language",
  },
  // Medical risk without qualification
  {
    pattern: /\b(take|stop taking|increase|decrease|double)\b.*\b(medication|dose|prescription|medicine|drug)\b/i,
    variables: { severity: 0.5, vulnerability: 0.4, proximate_cause: 0.5 },
    description: "Unqualified medical dosage guidance",
  },
];

// ── Benefit Signal Detection ────────────────────────────────────────

interface BenefitSignal {
  pattern: RegExp;
  weight: number;
  description: string;
}

const BENEFIT_SIGNALS: BenefitSignal[] = [
  { pattern: /\b(learn|educat|understand|explain|teach|tutorial)\b/i, weight: 0.3, description: "Educational value" },
  { pattern: /\b(creative|story|fiction|imagin|artistic|poem|novel)\b/i, weight: 0.2, description: "Creative value" },
  { pattern: /\b(save|efficien|productiv|optimize|improve|better|solution)\b/i, weight: 0.2, description: "Economic/practical value" },
  { pattern: /\b(support|comfort|encouragement|help|assist|care)\b/i, weight: 0.3, description: "Emotional/supportive value" },
  { pattern: /\b(research|study|academic|scientific|analysis|data)\b/i, weight: 0.3, description: "Research value" },
  { pattern: /\b(safety|prevent|protect|warn|caution|aware)\b/i, weight: 0.4, description: "Safety/preventive value" },
];

// ── The 1,000 Users Test ────────────────────────────────────────────

/**
 * "If 1,000 different users sent this exact message, what is the best
 *  policy-level response?"
 *
 * Estimates the population breakdown for a given request:
 * - What % have legitimate purposes?
 * - What % have ambiguous purposes?
 * - What % have malicious purposes?
 *
 * This is an APPROXIMATION. The real test is a thought experiment.
 * We approximate by looking at the specificity and harm potential
 * of the combined content.
 */
function runPopulationAnalysis(
  response: string,
  userInput: string,
  harmSignalCount: number,
  benefitSignalCount: number,
): PopulationAnalysis {
  // Base assumption: most people are legitimate
  let legitimate = 85;
  let ambiguous = 10;
  let malicious = 5;

  // Adjust based on signal ratio
  if (harmSignalCount > benefitSignalCount * 2) {
    // Significantly more harm signals than benefit signals
    legitimate -= 20;
    malicious += 15;
    ambiguous += 5;
  } else if (harmSignalCount > benefitSignalCount) {
    legitimate -= 10;
    malicious += 5;
    ambiguous += 5;
  } else if (benefitSignalCount > harmSignalCount * 2) {
    // Significantly more benefit signals
    legitimate += 10;
    malicious -= 3;
    ambiguous -= 7;
  }

  // Specificity adjustment: very specific harmful requests
  // are more likely malicious
  const combinedLen = (response + userInput).length;
  const harmDensity = combinedLen > 0 ? harmSignalCount / (combinedLen / 100) : 0;
  if (harmDensity > 0.5) {
    legitimate -= 15;
    malicious += 10;
    ambiguous += 5;
  }

  // Normalize so values always sum to exactly 100, none negative
  legitimate = Math.max(0, legitimate);
  malicious = Math.max(0, malicious);
  ambiguous = Math.max(0, ambiguous);
  const total = legitimate + malicious + ambiguous;
  if (total > 0) {
    legitimate = Math.round((legitimate / total) * 100);
    malicious = Math.round((malicious / total) * 100);
    ambiguous = 100 - legitimate - malicious;
  }

  return { legitimate_pct: legitimate, ambiguous_pct: ambiguous, malicious_pct: malicious };
}

// ── Counterfactual Impact ───────────────────────────────────────────

/**
 * "Would the harm occur anyway without the agent's assistance?"
 * If the information is freely available (e.g., on Wikipedia),
 * the agent's contribution to harm is lower.
 *
 * High counterfactual = information is freely available = lower weight.
 */
function estimateCounterfactualImpact(
  response: string,
): number {
  // General/common knowledge indicators → high counterfactual (low risk)
  const commonKnowledge = [
    /\b(wikipedia|google|common knowledge|well-known|publicly available|textbook)\b/i,
    /\b(first aid|cpr|heimlich|basic safety)\b/i,
  ];

  let counterfactual = 0.5; // default: moderate

  for (const pattern of commonKnowledge) {
    if (pattern.test(response)) {
      counterfactual += 0.2;
    }
  }

  // Specialized/rare knowledge indicators → low counterfactual (high risk)
  const specializedKnowledge = [
    /\b(classified|proprietary|trade secret|confidential|restricted)\b/i,
    /\b(synthesis route|precursor chemical|exploit code|zero-day)\b/i,
  ];

  for (const pattern of specializedKnowledge) {
    if (pattern.test(response)) {
      counterfactual -= 0.3;
    }
  }

  return Math.max(0, Math.min(1, counterfactual));
}

// ── Main Assessment ─────────────────────────────────────────────────

/**
 * Run the full 8-variable harm assessment.
 */
export function assessHarm(
  response: string,
  userInput: string,
  ruleset: Ruleset,
  topicResult: TopicClassificationResult,
  principalResult: PrincipalResolutionResult,
): HarmAssessmentResult {
  // Harm signals are detected on RESPONSE only — the user's words
  // should not inflate the harm score for a safe agent response.
  // User input is used for benefit/context detection where framing matters.
  const responseText = response;
  const contextText = `${userInput}\n${response}`;

  // 1. Detect harm signals on RESPONSE (not user input)
  const variables: HarmVariableScores = {
    probability: 0,
    counterfactual_impact: 0,
    severity: 0,
    reversibility: 0,
    breadth: 0,
    proximate_cause: 0,
    consent: 0,
    vulnerability: 0,
  };

  let harmSignalCount = 0;
  const triggeredSignals: string[] = [];

  for (const signal of HARM_SIGNALS) {
    if (signal.pattern.test(responseText)) {
      harmSignalCount++;
      triggeredSignals.push(signal.description);
      for (const [key, value] of Object.entries(signal.variables)) {
        const k = key as keyof HarmVariableScores;
        variables[k] = Math.min(1, variables[k] + (value as number));
      }
    }
  }

  // 2. Detect benefit signals
  let benefitSignalCount = 0;
  let benefitScore = 0;

  // Benefit signals check the full context (user framing matters)
  for (const signal of BENEFIT_SIGNALS) {
    if (signal.pattern.test(contextText)) {
      benefitSignalCount++;
      benefitScore = Math.min(1, benefitScore + signal.weight);
    }
  }

  // 3. Estimate counterfactual impact
  variables.counterfactual_impact = estimateCounterfactualImpact(response);

  // 4. Estimate probability based on accumulated signals
  variables.probability = Math.min(1, harmSignalCount * 0.15);

  // 5. Adjust for principal context
  if (principalResult.resolution === "override_for_safety") {
    // Safety override active — increase harm sensitivity
    variables.severity = Math.min(1, variables.severity + 0.2);
  }

  if (ruleset.principals.user_trust === "minor") {
    variables.vulnerability = Math.min(1, variables.vulnerability + 0.3);
  }

  if (ruleset.principals.user_trust === "vulnerable") {
    variables.vulnerability = Math.min(1, variables.vulnerability + 0.4);
  }

  // 6. Run the 1,000 Users Test
  const populationAnalysis = runPopulationAnalysis(
    response, userInput, harmSignalCount, benefitSignalCount,
  );

  // 7. Calculate aggregate harm score
  // Weighted average of all 8 variables
  // Severity and vulnerability are weighted higher per the constitution
  const weights = {
    probability: 1.0,
    counterfactual_impact: 0.8, // inverted — high counterfactual = LOWER harm
    severity: 1.5,
    reversibility: 1.2,
    breadth: 1.0,
    proximate_cause: 1.0,
    consent: 0.8,
    vulnerability: 1.5,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const k = key as keyof HarmVariableScores;
    let value = variables[k];
    // Invert counterfactual: high counterfactual = info freely available = LESS harm
    if (k === "counterfactual_impact") {
      value = 1 - value;
    }
    weightedSum += value * weight;
    totalWeight += weight;
  }

  const harmScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // 8. Adjust benefit score based on population analysis
  const adjustedBenefitScore = benefitScore * (populationAnalysis.legitimate_pct / 100);

  const detail = harmSignalCount > 0
    ? `Harm signals: ${triggeredSignals.join(", ")}. Population: ${populationAnalysis.legitimate_pct}% legitimate, ${populationAnalysis.malicious_pct}% malicious.`
    : "No harm signals detected.";

  return {
    harm_score: Math.round(harmScore * 1000) / 1000,
    benefit_score: Math.round(adjustedBenefitScore * 1000) / 1000,
    variables,
    population_analysis: populationAnalysis,
    detail,
  };
}
