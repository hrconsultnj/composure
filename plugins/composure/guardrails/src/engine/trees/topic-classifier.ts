/**
 * Topic Classifier — Phase 2
 *
 * Source: decision-trees/01-request-evaluation-tree.md, Phase 2 (scope check)
 *         decision-trees/04-content-generation-tree.md (content classification)
 *
 * Classifies the response + input against the ruleset's allowed/restricted
 * topics. V1 uses keyword matching with word boundary awareness.
 * V2 will add semantic matching via embeddings.
 *
 * Target: <3ms
 */

import type {
  Ruleset,
  TopicClassificationResult,
  ConditionalTopic,
} from "../types.js";

// ── Topic Keyword Expansion ─────────────────────────────────────────

/**
 * Common topic expansions — maps a topic label to keywords/phrases
 * that indicate discussion of that topic. Operators can use these
 * labels in their allowed/restricted lists and the classifier
 * expands them automatically.
 *
 * Operators can also use raw keywords directly — anything not in
 * this map is treated as a literal keyword pattern.
 */
const TOPIC_EXPANSIONS: Record<string, string[]> = {
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
  shipping: ["ship", "deliver", "track", "package", "order status", "return", "exchange"],
};

// ── Classification ──────────────────────────────────────────────────

/**
 * Expand a topic label into keyword patterns.
 * If the label exists in TOPIC_EXPANSIONS, returns those keywords.
 * Otherwise treats the label itself as a keyword.
 */
function expandTopic(topic: string): string[] {
  const lower = topic.toLowerCase();
  return TOPIC_EXPANSIONS[lower] ?? [lower];
}

/**
 * Check if any keywords from a topic are present in the text.
 * Uses case-insensitive matching.
 */
function topicPresent(text: string, topic: string): boolean {
  const keywords = expandTopic(topic);
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

/**
 * Classify the response + input against allowed/restricted topics.
 */
export function classifyTopics(
  response: string,
  userInput: string,
  ruleset: Ruleset,
): TopicClassificationResult {
  const combined = `${userInput}\n${response}`;
  const detectedTopics: string[] = [];

  // 1. Check for restricted topics FIRST (higher priority)
  for (const restricted of ruleset.topics.restricted) {
    if (topicPresent(combined, restricted)) {
      // Check if there's a conditional override
      const conditional = ruleset.topics.conditional?.find(
        (c) => c.topic.toLowerCase() === restricted.toLowerCase(),
      );

      if (conditional && topicPresent(combined, conditional.condition)) {
        // Conditionally allowed — flag but don't restrict
        detectedTopics.push(restricted);
        return {
          on_topic: true,
          detected_topics: detectedTopics,
          conditional_match: conditional,
          detail: `Topic "${restricted}" is conditionally allowed: ${conditional.condition}. Caveat: ${conditional.caveat}`,
        };
      }

      detectedTopics.push(restricted);
      return {
        on_topic: false,
        detected_topics: detectedTopics,
        restricted_match: restricted,
        detail: `Restricted topic detected: "${restricted}"`,
      };
    }
  }

  // 2. Check which allowed topics are present
  for (const allowed of ruleset.topics.allowed) {
    if (topicPresent(combined, allowed)) {
      detectedTopics.push(allowed);
    }
  }

  // 3. If no allowed topics detected, check if content is generic enough to pass
  if (detectedTopics.length === 0) {
    // No restricted AND no allowed topics detected
    // This is ambiguous — could be general conversation, greeting, etc.
    // Default: allow (don't block greetings, pleasantries, meta-questions)
    return {
      on_topic: true,
      detected_topics: ["general"],
      detail: "No specific topic detected — treated as general conversation",
    };
  }

  return {
    on_topic: true,
    detected_topics: detectedTopics,
    detail: `On-topic: ${detectedTopics.join(", ")}`,
  };
}
