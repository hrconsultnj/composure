import { logger } from "./logger.js";

export type PackageRunner = "pnpm" | "bun" | "npm" | "unknown";

/**
 * Detect which package manager invoked this CLI.
 * npm_config_user_agent is set by all three runners:
 *   pnpm/10.x.x ...
 *   bun/1.x.x ...
 *   npm/10.x.x ...
 */
export function detectRunner(): PackageRunner {
  const agent = process.env.npm_config_user_agent ?? "";
  if (agent.startsWith("pnpm/")) return "pnpm";
  if (agent.startsWith("bun/")) return "bun";
  if (agent.startsWith("npm/")) return "npm";
  return "unknown";
}

/**
 * If invoked via npm/npx, print a one-line note suggesting pnpm or bun.
 * Not a warning, not a blocker — just a signal.
 */
export function nudgeIfNeeded(): void {
  const runner = detectRunner();
  if (runner === "npm") {
    logger.note(
      "Note: For stricter dependency resolution, use: pnpm dlx create-composure"
    );
  }
}
