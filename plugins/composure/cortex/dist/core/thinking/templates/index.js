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
export const templates = {
    "code-review": {
        id: "code-review",
        name: "Code Review",
        description: "Systematic review: impact → blast radius → test gaps → findings → recommendation",
        steps: [
            { step_number: 1, prompt: "What changed? List the files, functions, and the nature of each change (new, modified, deleted).", thought_type: "analysis", optional: false },
            { step_number: 2, prompt: "What is the blast radius? Which files import from or depend on the changed code? Who are the callers?", thought_type: "analysis", optional: false },
            { step_number: 3, prompt: "Are there test gaps? For each changed function, does a test exist? Are edge cases covered?", thought_type: "analysis", optional: false },
            { step_number: 4, prompt: "What issues do I see? List bugs, style problems, missing validation, security concerns, or performance risks.", thought_type: "hypothesis", optional: false },
            { step_number: 5, prompt: "Is any previous thought wrong or incomplete? Revise if needed.", thought_type: "revision", optional: true },
            { step_number: 6, prompt: "Final recommendation: approve, request changes, or flag for discussion. Summarize the key finding.", thought_type: "conclusion", optional: false },
        ],
    },
    "bug-investigation": {
        id: "bug-investigation",
        name: "Bug Investigation",
        description: "Structured debugging: reproduce → isolate → root cause → fix → verify",
        steps: [
            { step_number: 1, prompt: "What is the reported behavior? What is the expected behavior? Can I reproduce it?", thought_type: "analysis", optional: false },
            { step_number: 2, prompt: "Where in the code does this behavior originate? Trace the execution path from input to output.", thought_type: "analysis", optional: false },
            { step_number: 3, prompt: "What is the root cause? Is it a logic error, missing check, race condition, or data issue?", thought_type: "hypothesis", optional: false },
            { step_number: 4, prompt: "Is my hypothesis correct? What evidence supports or contradicts it? Check edge cases.", thought_type: "verification", optional: false },
            { step_number: 5, prompt: "If my hypothesis was wrong, what else could cause this? Branch into alternative explanations.", thought_type: "revision", optional: true },
            { step_number: 6, prompt: "What is the fix? Be specific — which file, which function, what change.", thought_type: "conclusion", optional: false },
            { step_number: 7, prompt: "How do I verify the fix? What test scenario confirms the bug is gone without breaking existing behavior?", thought_type: "verification", optional: false },
        ],
    },
    "architecture-decision": {
        id: "architecture-decision",
        name: "Architecture Decision Record",
        description: "ADR-style: context → options → tradeoffs → constraints → decision → rationale",
        steps: [
            { step_number: 1, prompt: "What is the context? What problem or need drives this decision?", thought_type: "analysis", optional: false },
            { step_number: 2, prompt: "What are the options? List at least 2-3 viable approaches.", thought_type: "analysis", optional: false },
            { step_number: 3, prompt: "What are the tradeoffs for each option? Performance, complexity, maintainability, cost, team familiarity.", thought_type: "hypothesis", optional: false },
            { step_number: 4, prompt: "What constraints narrow the choice? Existing patterns, deadlines, dependencies, team expertise.", thought_type: "analysis", optional: false },
            { step_number: 5, prompt: "Challenge my assumptions. Is there an option I dismissed too quickly? A constraint that could be relaxed?", thought_type: "revision", optional: true },
            { step_number: 6, prompt: "Decision: which option, and WHY. The rationale should be clear enough that someone reading this in 6 months understands the choice.", thought_type: "conclusion", optional: false },
        ],
    },
    "guardrails-config": {
        id: "guardrails-config",
        name: "AIGRaaS Guardrails Configuration",
        description: "Domain setup: industry → topics → edge cases → rules → persona",
        steps: [
            { step_number: 1, prompt: "What is the business domain? What does the operator do? Who are the end users?", thought_type: "analysis", optional: false },
            { step_number: 2, prompt: "What topics should the agent handle? List core topics and adjacent topics.", thought_type: "analysis", optional: false },
            { step_number: 3, prompt: "What topics should be restricted? Consider liability, compliance, and off-brand subjects.", thought_type: "analysis", optional: false },
            { step_number: 4, prompt: "Edge cases: where do allowed and restricted topics overlap? Example: a party planner asked about food allergies.", thought_type: "hypothesis", optional: false },
            { step_number: 5, prompt: "Resolve each edge case: allow within context, redirect, or hard-block? Branch if the answer isn't clear.", thought_type: "verification", optional: false },
            { step_number: 6, prompt: "What persona should the agent have? Tone, formality, name, boundaries.", thought_type: "analysis", optional: false },
            { step_number: 7, prompt: "Final ruleset summary: allowed topics, restricted topics, edge case resolutions, persona definition, special behaviors.", thought_type: "conclusion", optional: false },
        ],
    },
    "incident-response": {
        id: "incident-response",
        name: "Incident Response",
        description: "Production incident: detect → assess → mitigate → root cause → prevent",
        steps: [
            { step_number: 1, prompt: "What is happening? What symptoms are users experiencing? What alerts fired?", thought_type: "analysis", optional: false },
            { step_number: 2, prompt: "What is the impact? How many users affected? Is data at risk? Is revenue affected?", thought_type: "analysis", optional: false },
            { step_number: 3, prompt: "What can we do RIGHT NOW to mitigate? Rollback, feature flag, redirect, scale up?", thought_type: "hypothesis", optional: false },
            { step_number: 4, prompt: "What is the root cause? Trace from symptom to source. Check recent deploys, config changes, external dependencies.", thought_type: "analysis", optional: false },
            { step_number: 5, prompt: "Verify the root cause: does the timeline match? Does the fix address the symptoms?", thought_type: "verification", optional: false },
            { step_number: 6, prompt: "How do we prevent recurrence? New test, monitoring alert, process change, or architecture fix?", thought_type: "conclusion", optional: false },
        ],
    },
    "refactor-plan": {
        id: "refactor-plan",
        name: "Refactor Plan",
        description: "Safe restructuring: goal → scope → dependencies → steps → verification",
        steps: [
            { step_number: 1, prompt: "What is the goal of this refactor? Better decomposition, clearer boundaries, performance, or testability?", thought_type: "analysis", optional: false },
            { step_number: 2, prompt: "What is the scope? Which files and functions are affected? What must NOT change (preservation boundaries)?", thought_type: "analysis", optional: false },
            { step_number: 3, prompt: "What depends on the code being refactored? Check importers, callers, and test coverage.", thought_type: "analysis", optional: false },
            { step_number: 4, prompt: "What is the step-by-step plan? Order matters — which moves must happen first to avoid broken imports?", thought_type: "hypothesis", optional: false },
            { step_number: 5, prompt: "Does this plan break any existing behavior? Verify each step preserves the public API.", thought_type: "verification", optional: false },
            { step_number: 6, prompt: "Final plan with verification strategy: what tests to run after each step, and how to confirm nothing broke.", thought_type: "conclusion", optional: false },
        ],
    },
};
/**
 * Get a template by ID. Returns null if not found.
 */
export function getTemplate(templateId) {
    return templates[templateId] ?? null;
}
/**
 * List all available templates.
 */
export function listTemplates() {
    return Object.values(templates).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        steps: t.steps.length,
    }));
}
/**
 * Get the next step prompt for a template, given the current thought number.
 * Returns null if all steps are complete.
 */
export function getNextStep(templateId, currentThoughtNumber) {
    const template = templates[templateId];
    if (!template)
        return null;
    const nextStep = template.steps.find((s) => s.step_number === currentThoughtNumber + 1);
    return nextStep ?? null;
}
//# sourceMappingURL=index.js.map