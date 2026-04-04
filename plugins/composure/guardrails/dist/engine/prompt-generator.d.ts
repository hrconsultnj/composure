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
import type { Ruleset } from "./types.js";
export type PromptFormat = "generic" | "vapi" | "11labs" | "bland";
/**
 * Generate a system prompt section from a Ruleset.
 */
export declare function generateSystemPrompt(ruleset: Ruleset, format?: PromptFormat): string;
