/**
 * Thinking session templates — pre-built reasoning patterns.
 *
 * Each template defines a sequence of guided steps that structure
 * the thinking chain. The steps are PROMPTS, not constraints —
 * the LLM can deviate, branch, or skip as needed.
 *
 * Templates map to common engineering workflows:
 * - code-review: systematic review of code changes
 * - bug-investigation: structured debugging
 * - architecture-decision: ADR-style decision making
 * - guardrails-config: AIGRaaS domain setup
 * - incident-response: production incident analysis
 * - refactor-plan: safe restructuring
 */
export interface TemplateStep {
    step_number: number;
    prompt: string;
    thought_type: string;
    optional: boolean;
}
export interface ThinkingTemplate {
    id: string;
    name: string;
    description: string;
    steps: TemplateStep[];
}
export declare const templates: Record<string, ThinkingTemplate>;
/**
 * Get a template by ID. Returns null if not found.
 */
export declare function getTemplate(templateId: string): ThinkingTemplate | null;
/**
 * List all available templates.
 */
export declare function listTemplates(): Array<{
    id: string;
    name: string;
    description: string;
    steps: number;
}>;
/**
 * Get the next step prompt for a template, given the current thought number.
 * Returns null if all steps are complete.
 */
export declare function getNextStep(templateId: string, currentThoughtNumber: number): TemplateStep | null;
