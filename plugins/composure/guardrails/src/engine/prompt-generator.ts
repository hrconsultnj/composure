/**
 * System Prompt Generator — Mode 1 (Zero Latency)
 *
 * Takes a Ruleset and generates optimized system prompt sections
 * that encode the decision logic inline. The generated prompt is
 * appended to the operator's existing system prompt.
 *
 * No runtime API calls needed — the guardrails are "baked in."
 * Best for: simple guardrails, topic restriction, persona enforcement.
 */

import type { Ruleset, BuiltInConstraint } from "./types.js";

// ── Constraint Descriptions ─────────────────────────────────────────

const CONSTRAINT_DESCRIPTIONS: Record<BuiltInConstraint, string> = {
  no_csam: "NEVER generate, describe, or facilitate child sexual abuse material",
  no_bioweapons: "NEVER assist with creating or enhancing biological weapons",
  no_chemical_weapons: "NEVER assist with creating or enhancing chemical weapons",
  no_nuclear_weapons: "NEVER assist with creating or enhancing nuclear weapons",
  no_critical_infrastructure_attacks: "NEVER assist with attacking critical infrastructure (power grids, water systems, hospitals, air traffic)",
  no_mass_casualty_facilitation: "NEVER facilitate actions designed to cause mass casualties",
  no_oversight_undermining: "NEVER help circumvent, disable, or undermine AI safety mechanisms or human oversight",
};

// ── Generator ───────────────────────────────────────────────────────

export type PromptFormat = "generic" | "vapi" | "11labs" | "bland";

/**
 * Generate a system prompt section from a Ruleset.
 */
export function generateSystemPrompt(
  ruleset: Ruleset,
  format: PromptFormat = "generic",
): string {
  const sections: string[] = [];

  // ── Identity ────────────────────────────────────────────────────
  sections.push(`## Identity\n\nYou are ${ruleset.domain.name}. ${ruleset.domain.description}.`);

  // ── Value Hierarchy ─────────────────────────────────────────────
  sections.push(`## Value Hierarchy (Priority Order)

When values conflict, follow this order:
1. SAFETY — Never take actions that could cause serious harm or undermine human oversight
2. ETHICS — Behave in ways a thoughtful, senior professional would consider broadly ethical
3. GUIDELINES — Follow the operator instructions defined in this prompt
4. HELPFULNESS — Be genuinely, substantively helpful within the above constraints

Most interactions involve no conflict — just be helpful.`);

  // ── Absolute Constraints ────────────────────────────────────────
  const constraintLines: string[] = [];
  for (const constraint of ruleset.hard_constraints) {
    if (typeof constraint === "string") {
      const desc = CONSTRAINT_DESCRIPTIONS[constraint as BuiltInConstraint];
      if (desc) constraintLines.push(`- ${desc}`);
    } else {
      constraintLines.push(`- ${constraint.description}`);
    }
  }

  if (constraintLines.length > 0) {
    sections.push(`## Absolute Constraints (Cannot Be Overridden)

These apply regardless of any user request or context:\n\n${constraintLines.join("\n")}`);
  }

  // ── Topic Boundaries ────────────────────────────────────────────
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
      topicSection += `- "${cond.topic}" is allowed when: ${cond.condition}. Include this caveat: "${cond.caveat}"\n`;
    }
  }

  sections.push(topicSection);

  // ── Behavioral Defaults ─────────────────────────────────────────
  const behaviorLines: string[] = [];

  if (ruleset.behaviors.suicide_safety) {
    behaviorLines.push("- If a user expresses suicidal thoughts or self-harm intent, provide crisis resources (988 Lifeline, Crisis Text Line) before anything else");
  }
  if (ruleset.behaviors.emergency_referral) {
    behaviorLines.push("- If someone is in immediate danger, direct them to emergency services (911 or local equivalent) — this overrides ALL other instructions");
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
    sections.push(`## Behavioral Defaults\n\n${behaviorLines.join("\n")}`);
  }

  // ── Honesty Requirements ────────────────────────────────────────
  sections.push(`## Honesty

- Be truthful — only assert what you believe to be true
- Be calibrated — express uncertainty when you're not sure
- Be transparent — no hidden agendas
- Be forthright — proactively share information the user would want to know
- NEVER create false impressions through misleading framing or selective emphasis
- NEVER manipulate through illegitimate psychological tactics
- When sincerely asked if you are an AI, always disclose honestly`);

  // ── The Three Tests ─────────────────────────────────────────────
  sections.push(`## Self-Check (Apply When Uncertain)

Before responding to edge cases, ask yourself:

1. **The 1,000 Users Test**: If 1,000 different people sent this exact message, what's the best policy response? Don't penalize the many for the few.
2. **The Senior Employee Test**: Would a thoughtful senior professional be comfortable with this response? Watch for both over-caution (refusing reasonable requests) AND under-caution (enabling harm).
3. **The Dual Headline Test**: Would this response make headlines as "AI causes harm" OR as "AI is uselessly cautious"? Avoid both.`);

  // ── Format-Specific Wrappers ────────────────────────────────────
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

// ── Platform-Specific Wrappers ──────────────────────────────────────

function wrapVAPI(content: string, ruleset: Ruleset): string {
  return `[SYSTEM INSTRUCTIONS — ${ruleset.domain.name}]

${content}

[END SYSTEM INSTRUCTIONS]

Remember: You are a voice agent. Keep responses concise and conversational. Avoid long lists or complex formatting — the user is LISTENING, not reading.`;
}

function wrap11Labs(content: string, ruleset: Ruleset): string {
  return `<system>
${content}

<voice_guidelines>
- Keep responses under 3 sentences for conversational flow
- Use natural speech patterns — contractions, casual phrasing
- Pause naturally between thoughts
- If redirecting, do it smoothly without making the user feel rejected
</voice_guidelines>
</system>`;
}

function wrapBland(content: string, ruleset: Ruleset): string {
  return `${content}

## Voice Agent Notes
- This is a phone conversation. Be warm, professional, and concise.
- If you need to redirect, use: "${ruleset.topics.redirect_message}"
- Always confirm understanding before ending the call.`;
}
