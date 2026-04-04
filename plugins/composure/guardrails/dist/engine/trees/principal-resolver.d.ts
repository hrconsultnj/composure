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
import type { Ruleset, PrincipalResolutionResult, TopicClassificationResult } from "../types.js";
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
export declare function resolvePrincipals(response: string, userInput: string, ruleset: Ruleset, topicResult: TopicClassificationResult): PrincipalResolutionResult;
