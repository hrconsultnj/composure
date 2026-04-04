#!/usr/bin/env node
import { createRequire } from 'module'; const require = createRequire(import.meta.url);

// dist/cli.js
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// dist/engine/trees/hard-constraints.js
var compiledPatternCache = /* @__PURE__ */ new Map();
function getCompiledPatterns(rulesetId, constraint) {
  const cacheKey = `${rulesetId}:${constraint.id}`;
  const cached = compiledPatternCache.get(cacheKey);
  if (cached)
    return cached;
  const compiled = [];
  for (const pattern of constraint.trigger_patterns) {
    try {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      compiled.push(new RegExp(escaped, "i"));
    } catch {
    }
  }
  compiledPatternCache.set(cacheKey, compiled);
  return compiled;
}
var BUILT_IN_PATTERNS = {
  no_csam: [
    /child\s+(sexual|porn|nude|naked|exploitation)/i,
    /minor\s+(sexual|porn|nude|naked)/i,
    /underage\s+(sexual|porn|nude|naked)/i,
    /\bcsa[m]\b/i
  ],
  no_bioweapons: [
    /\b(synthesiz|creat|mak|produc|engineer)\w*\s+(anthrax|botulinum|ricin|sarin|vx\b|smallpox|plague\s+weapon)/i,
    /bioweapon/i,
    /biological\s+weapon/i,
    /weaponiz\w+\s+(pathogen|virus|bacteri|toxin)/i
  ],
  no_chemical_weapons: [
    /\b(synthesiz|creat|mak|produc)\w*\s+(nerve\s+agent|mustard\s+gas|sarin|tabun|soman|vx\b|novichok)/i,
    /chemical\s+weapon/i,
    /weaponiz\w+\s+chemical/i
  ],
  no_nuclear_weapons: [
    /\b(build|assembl|construct|enrich)\w*\s+(nuclear\s+weapon|atomic\s+bomb|dirty\s+bomb)/i,
    /nuclear\s+weapon\s+(design|blueprint|schematic)/i,
    /weapons?\s*-?\s*grade\s+uranium\s+(enrich|refin|process)/i
  ],
  no_critical_infrastructure_attacks: [
    /\b(attack|hack|disrupt|destroy|sabotag)\w*\s+(power\s+grid|water\s+(supply|treatment)|hospital|air\s+traffic|nuclear\s+(plant|facility))/i,
    /critical\s+infrastructure\s+(attack|exploit|vulnerabilit)/i,
    /\bscada\s+(exploit|hack|attack)/i
  ],
  no_mass_casualty_facilitation: [
    /\b(mass\s+(shooting|casualt|killing)|bomb\s+(making|build|assembl)|explosive\s+device\s+(build|construct|assembl))/i,
    /maximize\s+(casualt|death|kill)/i,
    /\b(ied|improvised\s+explosive)\s*(build|mak|assembl|construct)/i
  ],
  no_oversight_undermining: [
    /\b(disabl|bypass|circumvent|remov|destroy)\w*\s+(safety\s+(system|mechanism|check|guardrail)|oversight|monitoring|kill\s+switch|shutdown\s+mechanism)/i,
    /\b(hide|conceal)\w*\s+(from\s+(human|operator)|activit|log|action)\w*\s+(monitor|oversight)/i
  ]
};
function evaluateHardConstraints(response, userInput, ruleset) {
  const combined = `${userInput}
${response}`;
  for (const constraint of Object.keys(BUILT_IN_PATTERNS)) {
    const patterns = BUILT_IN_PATTERNS[constraint];
    for (const pattern of patterns) {
      if (pattern.test(combined)) {
        return {
          passed: false,
          triggered_constraint: constraint,
          detail: `Constitutional hard constraint violated: ${constraint}`
        };
      }
    }
  }
  const flags = [];
  for (const constraint of ruleset.hard_constraints) {
    if (typeof constraint === "string") {
      continue;
    }
    const custom = constraint;
    const patterns = getCompiledPatterns(ruleset.id, custom);
    for (const regex of patterns) {
      if (regex.test(combined)) {
        if (custom.severity === "block") {
          return {
            passed: false,
            triggered_constraint: custom.id,
            detail: `Custom hard constraint violated: ${custom.description}`,
            flags
          };
        }
        flags.push(custom.id);
        break;
      }
    }
  }
  return {
    passed: true,
    detail: flags.length > 0 ? `All hard constraints passed. Flagged: ${flags.join(", ")}` : "All hard constraints passed",
    flags
  };
}

// dist/engine/trees/topic-classifier.js
var TOPIC_EXPANSIONS = {
  // Common restricted topics
  politics: ["politic", "democrat", "republican", "election", "congress", "senate", "partisan", "liberal", "conservative", "left-wing", "right-wing", "legislation", "ballot", "campaign"],
  religion: ["religio", "church", "mosque", "synagogue", "temple", "prayer", "scripture", "bible", "quran", "torah", "faith-based", "spiritual", "atheism", "theolog"],
  medical_advice: ["diagnos", "prescri", "medication", "symptom", "treatment plan", "medical condition", "dosage", "side effect", "clinical", "prognosis"],
  legal_advice: ["legal advice", "attorney", "lawsuit", "litigation", "court order", "legal counsel", "sue ", "liable", "liability", "statute of limitation"],
  financial_advice: ["invest advice", "stock pick", "portfolio allocation", "financial plan", "tax advice", "retirement plan", "securities", "fiduciary"],
  competitors: ["competitor", "vs ", "compared to", "better than", "switch from", "alternative to"],
  personal_opinions: ["i think", "i believe", "my opinion", "in my view", "personally"],
  self_harm: ["suicide", "self-harm", "self harm", "kill myself", "end my life", "want to die", "cutting myself"],
  weapons: ["weapon", "firearm", "gun", "rifle", "pistol", "ammunition", "explosive"],
  drugs: ["illegal drug", "narcotic", "cocaine", "heroin", "methamphetamine", "fentanyl", "drug dealer"],
  explicit: ["explicit", "pornograph", "sexually explicit", "adult content", "nsfw"],
  // Common allowed topics
  events: ["event", "party", "celebration", "gathering", "conference", "wedding", "birthday", "festival", "ceremony"],
  decorations: ["decor", "balloon", "banner", "centerpiece", "floral", "theme", "table setting", "lighting"],
  catering: ["cater", "food", "menu", "cuisine", "appetizer", "dessert", "dietary", "allergy", "vegetarian", "vegan", "gluten"],
  venues: ["venue", "location", "ballroom", "outdoor", "indoor", "capacity", "rental", "booking"],
  entertainment: ["entertainment", "music", "dj", "band", "performer", "game", "activit"],
  pricing: ["price", "cost", "budget", "quote", "estimate", "package", "discount", "payment"],
  scheduling: ["schedule", "calendar", "date", "time", "booking", "availability", "reservation"],
  support: ["help", "assist", "support", "issue", "problem", "question", "concern", "trouble"],
  billing: ["bill", "invoice", "charge", "refund", "payment", "subscription", "cancel"],
  shipping: ["ship", "deliver", "track", "package", "order status", "return", "exchange"]
};
function expandTopic(topic) {
  const lower = topic.toLowerCase();
  return TOPIC_EXPANSIONS[lower] ?? [lower];
}
function topicPresent(text, topic) {
  const keywords = expandTopic(topic);
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}
function classifyTopics(response, userInput, ruleset) {
  const combined = `${userInput}
${response}`;
  const detectedTopics = [];
  for (const restricted of ruleset.topics.restricted) {
    if (topicPresent(combined, restricted)) {
      const conditional = ruleset.topics.conditional?.find((c) => c.topic.toLowerCase() === restricted.toLowerCase());
      if (conditional && topicPresent(combined, conditional.condition)) {
        detectedTopics.push(restricted);
        return {
          on_topic: true,
          detected_topics: detectedTopics,
          conditional_match: conditional,
          detail: `Topic "${restricted}" is conditionally allowed: ${conditional.condition}. Caveat: ${conditional.caveat}`
        };
      }
      detectedTopics.push(restricted);
      return {
        on_topic: false,
        detected_topics: detectedTopics,
        restricted_match: restricted,
        detail: `Restricted topic detected: "${restricted}"`
      };
    }
  }
  for (const allowed of ruleset.topics.allowed) {
    if (topicPresent(combined, allowed)) {
      detectedTopics.push(allowed);
    }
  }
  if (detectedTopics.length === 0) {
    return {
      on_topic: true,
      detected_topics: ["general"],
      detail: "No specific topic detected \u2014 treated as general conversation"
    };
  }
  return {
    on_topic: true,
    detected_topics: detectedTopics,
    detail: `On-topic: ${detectedTopics.join(", ")}`
  };
}

// dist/engine/trees/principal-resolver.js
var EMERGENCY_PATTERNS = [
  // Immediate danger to life
  /\b(help|someone|i('m| am))\b.*\b(dying|overdos|heart attack|stroke|choking|bleeding out|can'?t breathe)\b/i,
  // Active self-harm crisis
  /\b(about to|going to|want to|plan to)\b.*\b(kill myself|end my life|commit suicide|jump off|hang myself)\b/i,
  // Active violence
  /\b(someone|he('s| is)|she('s| is))\b.*\b(attack|stab|shoot|hurt|threaten)\b.*\b(me|us|them|child|kid)\b/i,
  // Explicit call for emergency services
  /\b(call|need)\b.*\b(911|ambulance|police|emergency|paramedic)\b/i
];
function detectEmergency(userInput) {
  return EMERGENCY_PATTERNS.some((p) => p.test(userInput));
}
var USER_RIGHTS_PATTERNS = {
  /** User asks what the agent can't help with → MUST answer honestly */
  seeking_limitations: /\b(what|which)\b.*\b(can'?t|cannot|don'?t|unable)\b.*\b(help|do|answer|assist)\b/i,
  /** User sincerely asks if they're talking to AI → MUST disclose */
  ai_identity_query: /\b(are you|is this)\b.*\b(ai|artificial|robot|bot|human|real person|machine)\b/i,
  /** User needs to seek help elsewhere → MUST not prevent */
  seeking_alternatives: /\b(who else|where else|other option|another|someone else|real (person|human|doctor|lawyer))\b/i
};
function resolvePrincipals(response, userInput, ruleset, topicResult) {
  if (detectEmergency(userInput)) {
    return {
      conflict_detected: true,
      resolution: "override_for_safety",
      detail: "Emergency detected in user input \u2014 safety override active. Agent MUST provide emergency resources regardless of operator restrictions."
    };
  }
  for (const [right, pattern] of Object.entries(USER_RIGHTS_PATTERNS)) {
    if (pattern.test(userInput)) {
      return {
        conflict_detected: true,
        resolution: "defer_to_user",
        detail: `User exercising non-negotiable right: ${right}. Agent must respond honestly regardless of operator restrictions.`
      };
    }
  }
  if (!topicResult.on_topic && topicResult.restricted_match) {
    const safetyTopics = ["self_harm", "medical_advice", "emergency"];
    const isSafetyRelated = safetyTopics.includes(topicResult.restricted_match);
    if (isSafetyRelated && ruleset.behaviors.emergency_referral) {
      return {
        conflict_detected: true,
        resolution: "override_for_safety",
        detail: `Topic "${topicResult.restricted_match}" is restricted but safety-related. Agent will redirect with appropriate safety resources.`
      };
    }
    return {
      conflict_detected: true,
      resolution: "defer_to_operator",
      detail: `Topic "${topicResult.restricted_match}" restricted by operator. Legitimate business boundary \u2014 applying redirect.`
    };
  }
  if (ruleset.principals.user_trust === "minor") {
    return {
      conflict_detected: false,
      resolution: "no_conflict",
      detail: "User trust level: minor. Stricter content filtering active."
    };
  }
  if (ruleset.principals.user_trust === "verified_professional") {
    return {
      conflict_detected: false,
      resolution: "no_conflict",
      detail: "User trust level: verified_professional. Domain expertise assumed."
    };
  }
  return {
    conflict_detected: false,
    resolution: "no_conflict",
    detail: "No principal conflict detected. Standard helpfulness applies."
  };
}

// dist/engine/trees/harm-assessor.js
var HARM_SIGNALS = [
  // Physical harm indicators
  {
    pattern: /\b(injur|wound|bleed|pain|hurt|damag|break|fractur)\w*\b/i,
    variables: { severity: 0.3, reversibility: 0.4 },
    description: "Physical harm language"
  },
  // Irreversible action indicators
  {
    pattern: /\b(permanent|irreversibl|cannot be undone|no going back|point of no return)\b/i,
    variables: { severity: 0.5, reversibility: 0.8 },
    description: "Irreversible action language"
  },
  // Targeting vulnerable populations
  {
    pattern: /\b(child|minor|elderly|disabled|pregnant|vulnerable|at-risk|homeless|refugee)\b/i,
    variables: { vulnerability: 0.5 },
    description: "Vulnerable population reference"
  },
  // Broad impact indicators
  {
    pattern: /\b(everyone|public|community|population|widespread|mass|large-scale|national)\b/i,
    variables: { breadth: 0.4 },
    description: "Broad impact language"
  },
  // Direct causation indicators
  {
    pattern: /\b(step-by-step|instructions|how to|guide|tutorial|recipe for)\b/i,
    variables: { proximate_cause: 0.4 },
    description: "Instructional content (direct causation)"
  },
  // Financial harm indicators
  {
    pattern: /\b(guaranteed return|risk-free|can't lose|invest now|act fast|limited time|wire transfer|crypto.*invest)\b/i,
    variables: { severity: 0.4, consent: 0.3, vulnerability: 0.3 },
    description: "Financial manipulation language"
  },
  // Deception indicators
  {
    pattern: /\b(don't tell|keep secret|hide from|no one needs to know|between us|off the record)\b/i,
    variables: { consent: 0.5, proximate_cause: 0.3 },
    description: "Deception/secrecy language"
  },
  // Medical risk without qualification
  {
    pattern: /\b(take|stop taking|increase|decrease|double)\b.*\b(medication|dose|prescription|medicine|drug)\b/i,
    variables: { severity: 0.5, vulnerability: 0.4, proximate_cause: 0.5 },
    description: "Unqualified medical dosage guidance"
  }
];
var BENEFIT_SIGNALS = [
  { pattern: /\b(learn|educat|understand|explain|teach|tutorial)\b/i, weight: 0.3, description: "Educational value" },
  { pattern: /\b(creative|story|fiction|imagin|artistic|poem|novel)\b/i, weight: 0.2, description: "Creative value" },
  { pattern: /\b(save|efficien|productiv|optimize|improve|better|solution)\b/i, weight: 0.2, description: "Economic/practical value" },
  { pattern: /\b(support|comfort|encouragement|help|assist|care)\b/i, weight: 0.3, description: "Emotional/supportive value" },
  { pattern: /\b(research|study|academic|scientific|analysis|data)\b/i, weight: 0.3, description: "Research value" },
  { pattern: /\b(safety|prevent|protect|warn|caution|aware)\b/i, weight: 0.4, description: "Safety/preventive value" }
];
function runPopulationAnalysis(response, userInput, harmSignalCount, benefitSignalCount) {
  let legitimate = 85;
  let ambiguous = 10;
  let malicious = 5;
  if (harmSignalCount > benefitSignalCount * 2) {
    legitimate -= 20;
    malicious += 15;
    ambiguous += 5;
  } else if (harmSignalCount > benefitSignalCount) {
    legitimate -= 10;
    malicious += 5;
    ambiguous += 5;
  } else if (benefitSignalCount > harmSignalCount * 2) {
    legitimate += 10;
    malicious -= 3;
    ambiguous -= 7;
  }
  const combinedLen = (response + userInput).length;
  const harmDensity = combinedLen > 0 ? harmSignalCount / (combinedLen / 100) : 0;
  if (harmDensity > 0.5) {
    legitimate -= 15;
    malicious += 10;
    ambiguous += 5;
  }
  legitimate = Math.max(0, legitimate);
  malicious = Math.max(0, malicious);
  ambiguous = Math.max(0, ambiguous);
  const total = legitimate + malicious + ambiguous;
  if (total > 0) {
    legitimate = Math.round(legitimate / total * 100);
    malicious = Math.round(malicious / total * 100);
    ambiguous = 100 - legitimate - malicious;
  }
  return { legitimate_pct: legitimate, ambiguous_pct: ambiguous, malicious_pct: malicious };
}
function estimateCounterfactualImpact(response) {
  const commonKnowledge = [
    /\b(wikipedia|google|common knowledge|well-known|publicly available|textbook)\b/i,
    /\b(first aid|cpr|heimlich|basic safety)\b/i
  ];
  let counterfactual = 0.5;
  for (const pattern of commonKnowledge) {
    if (pattern.test(response)) {
      counterfactual += 0.2;
    }
  }
  const specializedKnowledge = [
    /\b(classified|proprietary|trade secret|confidential|restricted)\b/i,
    /\b(synthesis route|precursor chemical|exploit code|zero-day)\b/i
  ];
  for (const pattern of specializedKnowledge) {
    if (pattern.test(response)) {
      counterfactual -= 0.3;
    }
  }
  return Math.max(0, Math.min(1, counterfactual));
}
function assessHarm(response, userInput, ruleset, topicResult, principalResult) {
  const responseText = response;
  const contextText = `${userInput}
${response}`;
  const variables = {
    probability: 0,
    counterfactual_impact: 0,
    severity: 0,
    reversibility: 0,
    breadth: 0,
    proximate_cause: 0,
    consent: 0,
    vulnerability: 0
  };
  let harmSignalCount = 0;
  const triggeredSignals = [];
  for (const signal of HARM_SIGNALS) {
    if (signal.pattern.test(responseText)) {
      harmSignalCount++;
      triggeredSignals.push(signal.description);
      for (const [key, value] of Object.entries(signal.variables)) {
        const k = key;
        variables[k] = Math.min(1, variables[k] + value);
      }
    }
  }
  let benefitSignalCount = 0;
  let benefitScore = 0;
  for (const signal of BENEFIT_SIGNALS) {
    if (signal.pattern.test(contextText)) {
      benefitSignalCount++;
      benefitScore = Math.min(1, benefitScore + signal.weight);
    }
  }
  variables.counterfactual_impact = estimateCounterfactualImpact(response);
  variables.probability = Math.min(1, harmSignalCount * 0.15);
  if (principalResult.resolution === "override_for_safety") {
    variables.severity = Math.min(1, variables.severity + 0.2);
  }
  if (ruleset.principals.user_trust === "minor") {
    variables.vulnerability = Math.min(1, variables.vulnerability + 0.3);
  }
  if (ruleset.principals.user_trust === "vulnerable") {
    variables.vulnerability = Math.min(1, variables.vulnerability + 0.4);
  }
  const populationAnalysis = runPopulationAnalysis(response, userInput, harmSignalCount, benefitSignalCount);
  const weights = {
    probability: 1,
    counterfactual_impact: 0.8,
    // inverted — high counterfactual = LOWER harm
    severity: 1.5,
    reversibility: 1.2,
    breadth: 1,
    proximate_cause: 1,
    consent: 0.8,
    vulnerability: 1.5
  };
  let weightedSum = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const k = key;
    let value = variables[k];
    if (k === "counterfactual_impact") {
      value = 1 - value;
    }
    weightedSum += value * weight;
    totalWeight += weight;
  }
  const harmScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const adjustedBenefitScore = benefitScore * (populationAnalysis.legitimate_pct / 100);
  const detail = harmSignalCount > 0 ? `Harm signals: ${triggeredSignals.join(", ")}. Population: ${populationAnalysis.legitimate_pct}% legitimate, ${populationAnalysis.malicious_pct}% malicious.` : "No harm signals detected.";
  return {
    harm_score: Math.round(harmScore * 1e3) / 1e3,
    benefit_score: Math.round(adjustedBenefitScore * 1e3) / 1e3,
    variables,
    population_analysis: populationAnalysis,
    detail
  };
}

// dist/engine/trees/verdict-generator.js
var HARM_BLOCK_THRESHOLD = 0.7;
var HARM_REDIRECT_THRESHOLD = 0.4;
var BENEFIT_HARM_RATIO = 1.5;
var MALICIOUS_POPULATION_THRESHOLD = 30;
function buildRedirectSuggestion(ruleset, topicResult, principalResult) {
  if (principalResult.resolution === "override_for_safety") {
    return "If you or someone you know is in immediate danger, please call 911 (US) or your local emergency number. For emotional support, contact the 988 Suicide & Crisis Lifeline (call/text 988) or Crisis Text Line (text HOME to 741741).";
  }
  if (!topicResult.on_topic && topicResult.restricted_match) {
    const base = ruleset.topics.redirect_message;
    if (base)
      return base;
    return `I'm not able to help with ${topicResult.restricted_match} topics. Let me help you with something in my area of expertise instead.`;
  }
  if (principalResult.resolution === "defer_to_user") {
    return "I want to be straightforward with you about my capabilities and limitations.";
  }
  return "Let me help you with something I'm better equipped to assist with.";
}
function runSeniorEmployeeTest(verdict, harmResult, topicResult, principalResult) {
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
function runNewspaperTest(verdict, harmResult) {
  if (verdict === "pass" && harmResult.harm_score > 0.5) {
    return "fails_harmful";
  }
  if ((verdict === "block" || verdict === "redirect") && harmResult.harm_score < 0.2 && harmResult.benefit_score > 0.4) {
    return "fails_unhelpful";
  }
  return "passes_both";
}
function generateVerdict(ruleset, hardResult, topicResult, principalResult, harmResult) {
  if (!hardResult.passed) {
    return {
      verdict: "block",
      reason: hardResult.detail,
      senior_employee_test: "comfortable",
      newspaper_test: "passes_both"
    };
  }
  if (principalResult.resolution === "override_for_safety") {
    const suggestion = buildRedirectSuggestion(ruleset, topicResult, principalResult);
    return {
      verdict: "redirect",
      reason: principalResult.detail,
      suggestion,
      senior_employee_test: "comfortable",
      newspaper_test: "passes_both"
    };
  }
  if (!topicResult.on_topic) {
    const suggestion = buildRedirectSuggestion(ruleset, topicResult, principalResult);
    let verdict2 = "redirect";
    const seniorTest2 = runSeniorEmployeeTest(verdict2, harmResult, topicResult, principalResult);
    if (seniorTest2 === "too_cautious") {
      verdict2 = "pass";
      return {
        verdict: verdict2,
        reason: `Topic "${topicResult.restricted_match}" was flagged but the senior employee test suggests this is a reasonable request. Passing with monitoring.`,
        senior_employee_test: seniorTest2,
        newspaper_test: runNewspaperTest(verdict2, harmResult)
      };
    }
    return {
      verdict: verdict2,
      reason: topicResult.detail,
      suggestion,
      senior_employee_test: seniorTest2,
      newspaper_test: runNewspaperTest(verdict2, harmResult)
    };
  }
  if (principalResult.resolution === "defer_to_user") {
    return {
      verdict: "pass",
      reason: principalResult.detail,
      suggestion: buildRedirectSuggestion(ruleset, topicResult, principalResult),
      senior_employee_test: "comfortable",
      newspaper_test: "passes_both"
    };
  }
  const { harm_score, benefit_score, population_analysis } = harmResult;
  if (harm_score >= HARM_BLOCK_THRESHOLD) {
    return {
      verdict: "block",
      reason: `Harm score ${harm_score} exceeds block threshold. ${harmResult.detail}`,
      senior_employee_test: "comfortable",
      newspaper_test: "passes_both"
    };
  }
  if (population_analysis.malicious_pct >= MALICIOUS_POPULATION_THRESHOLD) {
    return {
      verdict: "block",
      reason: `Population analysis: ${population_analysis.malicious_pct}% estimated malicious use. ${harmResult.detail}`,
      senior_employee_test: "comfortable",
      newspaper_test: "passes_both"
    };
  }
  if (harm_score >= HARM_REDIRECT_THRESHOLD) {
    if (benefit_score > harm_score * BENEFIT_HARM_RATIO) {
      let verdict3 = "modify";
      return {
        verdict: verdict3,
        reason: `Moderate harm (${harm_score}) but high benefit (${benefit_score}). Passing with modifications.`,
        suggestion: topicResult.conditional_match?.caveat,
        senior_employee_test: runSeniorEmployeeTest(verdict3, harmResult, topicResult, principalResult),
        newspaper_test: runNewspaperTest(verdict3, harmResult)
      };
    }
    let verdict2 = "redirect";
    return {
      verdict: verdict2,
      reason: `Moderate harm (${harm_score}) exceeds benefit (${benefit_score}). Redirecting. ${harmResult.detail}`,
      suggestion: buildRedirectSuggestion(ruleset, topicResult, principalResult),
      senior_employee_test: runSeniorEmployeeTest(verdict2, harmResult, topicResult, principalResult),
      newspaper_test: runNewspaperTest(verdict2, harmResult)
    };
  }
  let verdict = "pass";
  const seniorTest = runSeniorEmployeeTest(verdict, harmResult, topicResult, principalResult);
  const newspaperTest = runNewspaperTest(verdict, harmResult);
  if (seniorTest === "too_permissive" || newspaperTest === "fails_harmful") {
    verdict = "redirect";
    return {
      verdict,
      reason: `Tests flagged concern: senior_employee=${seniorTest}, newspaper=${newspaperTest}. Redirecting as precaution.`,
      suggestion: buildRedirectSuggestion(ruleset, topicResult, principalResult),
      senior_employee_test: seniorTest,
      newspaper_test: newspaperTest
    };
  }
  if (topicResult.conditional_match) {
    return {
      verdict: "modify",
      reason: topicResult.detail,
      suggestion: topicResult.conditional_match.caveat,
      senior_employee_test: seniorTest,
      newspaper_test: newspaperTest
    };
  }
  return {
    verdict: "pass",
    reason: "All checks passed. Response is on-topic, within principal bounds, and low-harm.",
    senior_employee_test: seniorTest,
    newspaper_test: newspaperTest
  };
}

// dist/engine/engine.js
function evaluate(request) {
  const start = performance.now();
  const { response, user_input, ruleset } = request;
  const decisionPath = [];
  const hardResult = evaluateHardConstraints(response, user_input, ruleset);
  decisionPath.push({
    phase: "hard_constraint",
    result: hardResult.passed ? "pass" : "fail",
    detail: hardResult.detail
  });
  if (!hardResult.passed) {
    const latency2 = Math.round((performance.now() - start) * 100) / 100;
    return {
      verdict: "block",
      reason: hardResult.detail,
      decision_path: decisionPath,
      latency_ms: latency2
    };
  }
  const topicResult = classifyTopics(response, user_input, ruleset);
  decisionPath.push({
    phase: "topic",
    result: topicResult.on_topic ? "pass" : "fail",
    detail: topicResult.detail
  });
  const principalResult = resolvePrincipals(response, user_input, ruleset, topicResult);
  decisionPath.push({
    phase: "principal",
    result: principalResult.conflict_detected ? "flag" : "pass",
    detail: principalResult.detail
  });
  const harmResult = assessHarm(response, user_input, ruleset, topicResult, principalResult);
  decisionPath.push({
    phase: "harm",
    result: harmResult.harm_score < 0.4 ? "pass" : "flag",
    detail: harmResult.detail,
    score: harmResult.harm_score
  });
  const verdictResult = generateVerdict(ruleset, hardResult, topicResult, principalResult, harmResult);
  decisionPath.push({
    phase: "verdict",
    result: verdictResult.verdict === "pass" ? "pass" : "fail",
    detail: `${verdictResult.reason} | Senior Employee: ${verdictResult.senior_employee_test} | Newspaper: ${verdictResult.newspaper_test}`
  });
  const latency = Math.round((performance.now() - start) * 100) / 100;
  return {
    verdict: verdictResult.verdict,
    reason: verdictResult.reason,
    suggestion: verdictResult.suggestion,
    decision_path: decisionPath,
    latency_ms: latency
  };
}

// dist/engine/prompt-generator.js
var CONSTRAINT_DESCRIPTIONS = {
  no_csam: "NEVER generate, describe, or facilitate child sexual abuse material",
  no_bioweapons: "NEVER assist with creating or enhancing biological weapons",
  no_chemical_weapons: "NEVER assist with creating or enhancing chemical weapons",
  no_nuclear_weapons: "NEVER assist with creating or enhancing nuclear weapons",
  no_critical_infrastructure_attacks: "NEVER assist with attacking critical infrastructure (power grids, water systems, hospitals, air traffic)",
  no_mass_casualty_facilitation: "NEVER facilitate actions designed to cause mass casualties",
  no_oversight_undermining: "NEVER help circumvent, disable, or undermine AI safety mechanisms or human oversight"
};
function generateSystemPrompt(ruleset, format = "generic") {
  const sections = [];
  sections.push(`## Identity

You are ${ruleset.domain.name}. ${ruleset.domain.description}.`);
  sections.push(`## Value Hierarchy (Priority Order)

When values conflict, follow this order:
1. SAFETY \u2014 Never take actions that could cause serious harm or undermine human oversight
2. ETHICS \u2014 Behave in ways a thoughtful, senior professional would consider broadly ethical
3. GUIDELINES \u2014 Follow the operator instructions defined in this prompt
4. HELPFULNESS \u2014 Be genuinely, substantively helpful within the above constraints

Most interactions involve no conflict \u2014 just be helpful.`);
  const constraintLines = [];
  for (const constraint of ruleset.hard_constraints) {
    if (typeof constraint === "string") {
      const desc = CONSTRAINT_DESCRIPTIONS[constraint];
      if (desc)
        constraintLines.push(`- ${desc}`);
    } else {
      constraintLines.push(`- ${constraint.description}`);
    }
  }
  if (constraintLines.length > 0) {
    sections.push(`## Absolute Constraints (Cannot Be Overridden)

These apply regardless of any user request or context:

${constraintLines.join("\n")}`);
  }
  const allowedStr = ruleset.topics.allowed.map((t) => `"${t}"`).join(", ");
  const restrictedStr = ruleset.topics.restricted.map((t) => `"${t}"`).join(", ");
  let topicSection = `## Topic Boundaries

**Allowed topics:** ${allowedStr}
**Restricted topics:** ${restrictedStr}

When a user asks about a restricted topic, respond with:
"${ruleset.topics.redirect_message}"

Do NOT refuse rudely or lecture the user. Redirect warmly and offer to help with something in scope.`;
  if (ruleset.topics.conditional && ruleset.topics.conditional.length > 0) {
    topicSection += "\n\n**Conditional exceptions:**\n";
    for (const cond of ruleset.topics.conditional) {
      topicSection += `- "${cond.topic}" is allowed when: ${cond.condition}. Include this caveat: "${cond.caveat}"
`;
    }
  }
  sections.push(topicSection);
  const behaviorLines = [];
  if (ruleset.behaviors.suicide_safety) {
    behaviorLines.push("- If a user expresses suicidal thoughts or self-harm intent, provide crisis resources (988 Lifeline, Crisis Text Line) before anything else");
  }
  if (ruleset.behaviors.emergency_referral) {
    behaviorLines.push("- If someone is in immediate danger, direct them to emergency services (911 or local equivalent) \u2014 this overrides ALL other instructions");
  }
  if (ruleset.behaviors.language_match) {
    behaviorLines.push("- Respond in the same language the user uses");
  }
  if (ruleset.behaviors.age_appropriate) {
    behaviorLines.push("- Keep all content appropriate for a general audience unless the operator has specified otherwise");
  }
  if (ruleset.behaviors.safety_caveats) {
    behaviorLines.push("- When discussing anything potentially dangerous, include appropriate safety information");
  }
  if (behaviorLines.length > 0) {
    sections.push(`## Behavioral Defaults

${behaviorLines.join("\n")}`);
  }
  sections.push(`## Honesty

- Be truthful \u2014 only assert what you believe to be true
- Be calibrated \u2014 express uncertainty when you're not sure
- Be transparent \u2014 no hidden agendas
- Be forthright \u2014 proactively share information the user would want to know
- NEVER create false impressions through misleading framing or selective emphasis
- NEVER manipulate through illegitimate psychological tactics
- When sincerely asked if you are an AI, always disclose honestly`);
  sections.push(`## Self-Check (Apply When Uncertain)

Before responding to edge cases, ask yourself:

1. **The 1,000 Users Test**: If 1,000 different people sent this exact message, what's the best policy response? Don't penalize the many for the few.
2. **The Senior Employee Test**: Would a thoughtful senior professional be comfortable with this response? Watch for both over-caution (refusing reasonable requests) AND under-caution (enabling harm).
3. **The Dual Headline Test**: Would this response make headlines as "AI causes harm" OR as "AI is uselessly cautious"? Avoid both.`);
  const content = sections.join("\n\n---\n\n");
  switch (format) {
    case "vapi":
      return wrapVAPI(content, ruleset);
    case "11labs":
      return wrap11Labs(content, ruleset);
    case "bland":
      return wrapBland(content, ruleset);
    default:
      return content;
  }
}
function wrapVAPI(content, ruleset) {
  return `[SYSTEM INSTRUCTIONS \u2014 ${ruleset.domain.name}]

${content}

[END SYSTEM INSTRUCTIONS]

Remember: You are a voice agent. Keep responses concise and conversational. Avoid long lists or complex formatting \u2014 the user is LISTENING, not reading.`;
}
function wrap11Labs(content, ruleset) {
  return `<system>
${content}

<voice_guidelines>
- Keep responses under 3 sentences for conversational flow
- Use natural speech patterns \u2014 contractions, casual phrasing
- Pause naturally between thoughts
- If redirecting, do it smoothly without making the user feel rejected
</voice_guidelines>
</system>`;
}
function wrapBland(content, ruleset) {
  return `${content}

## Voice Agent Notes
- This is a phone conversation. Be warm, professional, and concise.
- If you need to redirect, use: "${ruleset.topics.redirect_message}"
- Always confirm understanding before ending the call.`;
}

// dist/cli.js
var __dirname = dirname(fileURLToPath(import.meta.url));
function loadRuleset(name) {
  try {
    return JSON.parse(readFileSync(join(__dirname, "rulesets", `${name}.json`), "utf-8"));
  } catch {
    return null;
  }
}
var AVAILABLE = ["customer-service", "healthcare", "financial", "general"];
var commands = {
  evaluate: (args2) => {
    const ruleset = args2.ruleset_json ? JSON.parse(args2.ruleset_json) : loadRuleset(args2.ruleset ?? "general");
    if (!ruleset)
      return { status: "error", error: `Ruleset not found`, available: AVAILABLE };
    return { status: "ok", ...evaluate({ response: args2.response, user_input: args2.user_input, ruleset }) };
  },
  prompt: (args2) => {
    const ruleset = args2.ruleset_json ? JSON.parse(args2.ruleset_json) : loadRuleset(args2.ruleset ?? "general");
    if (!ruleset)
      return { status: "error", error: `Ruleset not found` };
    return { status: "ok", prompt: generateSystemPrompt(ruleset, args2.format ?? "generic") };
  },
  rulesets: () => ({
    status: "ok",
    rulesets: AVAILABLE.map((name) => {
      const rs = loadRuleset(name);
      return { name, domain: rs?.domain?.name ?? name };
    })
  })
};
var command = process.argv[2];
if (!command || command === "--help") {
  console.error("Usage: guardrails-cli <command> [json-args]");
  console.error("Commands: evaluate, prompt, rulesets");
  process.exit(command ? 0 : 1);
}
var handler = commands[command];
if (!handler) {
  console.error(`Unknown command: ${command}. Available: ${Object.keys(commands).join(", ")}`);
  process.exit(1);
}
var args = {};
if (process.argv[3]) {
  try {
    args = JSON.parse(process.argv[3]);
  } catch {
    console.error(`Invalid JSON: ${process.argv[3]}`);
    process.exit(1);
  }
}
try {
  console.log(JSON.stringify(handler(args), null, 2));
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
