/**
 * Hard Constraints Decision Tree — Phase 1
 *
 * Source: decision-trees/01-request-evaluation-tree.md, Phase 1
 *
 * Absolute constraints that CANNOT be overridden by any principal.
 * Boolean pass/fail. If any constraint triggers, the evaluation
 * short-circuits to BLOCK with no further processing.
 *
 * Target: <1ms
 */

import type {
  Ruleset,
  HardConstraintResult,
  BuiltInConstraint,
  CustomConstraint,
} from "../types.js";

// ── Custom Pattern Cache ────────────────────────────────────────────

/**
 * Pre-compiled regex cache for custom constraints.
 * Avoids ReDoS by compiling once and catching invalid patterns.
 * Keyed by ruleset ID + constraint ID.
 */
const compiledPatternCache = new Map<string, RegExp[]>();

function getCompiledPatterns(rulesetId: string, constraint: CustomConstraint): RegExp[] {
  const cacheKey = `${rulesetId}:${constraint.id}`;
  const cached = compiledPatternCache.get(cacheKey);
  if (cached) return cached;

  const compiled: RegExp[] = [];
  for (const pattern of constraint.trigger_patterns) {
    try {
      // Use simple string matching for safety — escape regex specials
      // and only allow basic patterns. This prevents ReDoS from
      // operator-authored patterns.
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      compiled.push(new RegExp(escaped, "i"));
    } catch {
      // Invalid pattern — skip silently (logged at config time)
    }
  }
  compiledPatternCache.set(cacheKey, compiled);
  return compiled;
}

// ── Built-in Constraint Patterns ────────────────────────────────────

/**
 * Constitutional hard constraints from Anthropic.
 * These patterns are deliberately broad — they catch OBVIOUS violations.
 * Subtle/ambiguous cases are handled by the harm assessor (Phase 4).
 *
 * Each pattern array is ORed: if ANY pattern matches, the constraint fires.
 * Matching is case-insensitive against the combined response + user_input.
 */
const BUILT_IN_PATTERNS: Record<BuiltInConstraint, RegExp[]> = {
  no_csam: [
    /child\s+(sexual|porn|nude|naked|exploitation)/i,
    /minor\s+(sexual|porn|nude|naked)/i,
    /underage\s+(sexual|porn|nude|naked)/i,
    /\bcsa[m]\b/i,
  ],
  no_bioweapons: [
    /\b(synthesiz|creat|mak|produc|engineer)\w*\s+(anthrax|botulinum|ricin|sarin|vx\b|smallpox|plague\s+weapon)/i,
    /bioweapon/i,
    /biological\s+weapon/i,
    /weaponiz\w+\s+(pathogen|virus|bacteri|toxin)/i,
  ],
  no_chemical_weapons: [
    /\b(synthesiz|creat|mak|produc)\w*\s+(nerve\s+agent|mustard\s+gas|sarin|tabun|soman|vx\b|novichok)/i,
    /chemical\s+weapon/i,
    /weaponiz\w+\s+chemical/i,
  ],
  no_nuclear_weapons: [
    /\b(build|assembl|construct|enrich)\w*\s+(nuclear\s+weapon|atomic\s+bomb|dirty\s+bomb)/i,
    /nuclear\s+weapon\s+(design|blueprint|schematic)/i,
    /weapons?\s*-?\s*grade\s+uranium\s+(enrich|refin|process)/i,
  ],
  no_critical_infrastructure_attacks: [
    /\b(attack|hack|disrupt|destroy|sabotag)\w*\s+(power\s+grid|water\s+(supply|treatment)|hospital|air\s+traffic|nuclear\s+(plant|facility))/i,
    /critical\s+infrastructure\s+(attack|exploit|vulnerabilit)/i,
    /\bscada\s+(exploit|hack|attack)/i,
  ],
  no_mass_casualty_facilitation: [
    /\b(mass\s+(shooting|casualt|killing)|bomb\s+(making|build|assembl)|explosive\s+device\s+(build|construct|assembl))/i,
    /maximize\s+(casualt|death|kill)/i,
    /\b(ied|improvised\s+explosive)\s*(build|mak|assembl|construct)/i,
  ],
  no_oversight_undermining: [
    /\b(disabl|bypass|circumvent|remov|destroy)\w*\s+(safety\s+(system|mechanism|check|guardrail)|oversight|monitoring|kill\s+switch|shutdown\s+mechanism)/i,
    /\b(hide|conceal)\w*\s+(from\s+(human|operator)|activit|log|action)\w*\s+(monitor|oversight)/i,
  ],
};

// ── Evaluation ──────────────────────────────────────────────────────

/**
 * Check the combined response + input against all hard constraints.
 * Returns immediately on first match (short-circuit).
 */
export function evaluateHardConstraints(
  response: string,
  userInput: string,
  ruleset: Ruleset,
): HardConstraintResult {
  const combined = `${userInput}\n${response}`;

  // 1. Check all built-in constitutional constraints
  for (const constraint of Object.keys(BUILT_IN_PATTERNS) as BuiltInConstraint[]) {
    const patterns = BUILT_IN_PATTERNS[constraint];
    for (const pattern of patterns) {
      if (pattern.test(combined)) {
        return {
          passed: false,
          triggered_constraint: constraint,
          detail: `Constitutional hard constraint violated: ${constraint}`,
        };
      }
    }
  }

  // 2. Check custom operator-defined constraints
  const flags: string[] = [];

  for (const constraint of ruleset.hard_constraints) {
    if (typeof constraint === "string") {
      // Built-in constraint reference — already checked above
      continue;
    }

    // Custom constraint with pre-compiled patterns (no ReDoS risk)
    const custom = constraint as CustomConstraint;
    const patterns = getCompiledPatterns(ruleset.id, custom);

    for (const regex of patterns) {
      if (regex.test(combined)) {
        if (custom.severity === "block") {
          return {
            passed: false,
            triggered_constraint: custom.id,
            detail: `Custom hard constraint violated: ${custom.description}`,
            flags,
          };
        }
        // severity === "flag" — collect for downstream phases
        flags.push(custom.id);
        break; // one match per constraint is enough
      }
    }
  }

  return {
    passed: true,
    detail: flags.length > 0
      ? `All hard constraints passed. Flagged: ${flags.join(", ")}`
      : "All hard constraints passed",
    flags,
  };
}
