/**
 * AIGRaaS Core Types
 *
 * The contract for the entire evaluation engine. Every tree, the orchestrator,
 * and external consumers build on these types.
 */
/** Default behavior configuration — all ON behaviors on, all OFF behaviors off */
export const DEFAULT_BEHAVIORS = {
    suicide_safety: true,
    safety_caveats: true,
    language_match: true,
    age_appropriate: true,
    emergency_referral: true,
    explicit_content: false,
    graphic_violence: false,
    controversial_personas: false,
};
//# sourceMappingURL=types.js.map