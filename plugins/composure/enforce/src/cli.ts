#!/usr/bin/env node
/**
 * composure-enforce CLI — entry point for hooks and direct use.
 *
 * Usage:
 *   composure-enforce validate <file> [--content <string>]
 *   composure-enforce framework <file> [--content <string>]
 *   composure-enforce quality <file>
 *   composure-enforce rules [--language <lang>]
 *   composure-enforce all <file> [--content <string>]
 *
 * Exit codes:
 *   0 — No violations (passed)
 *   2 — Violations found (blocked)
 */

import { readFileSync } from "node:fs";
import {
  validateCode,
  frameworkCheck,
  checkQuality,
  validateAll,
  getRules,
} from "./engine.js";
import { runAdapter, type Platform } from "./adapters.js";

const args = process.argv.slice(2);
const command = args[0];

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

function readContent(filePath: string): string {
  const contentArg = getArg("--content");
  if (contentArg) return contentArg;
  // Read from stdin if available, otherwise read file
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    console.error(`Cannot read file: ${filePath}`);
    process.exit(1);
  }
}

function printViolations(
  violations: Array<{ rule: string; severity: string; message: string }>,
  label: string,
): void {
  if (violations.length === 0) return;
  console.error(`${label}:`);
  for (const v of violations) {
    console.error(`  - [${v.rule}] ${v.message}`);
  }
}

async function main() {
  const filePath = args[1];
  const pluginRoot = getArg("--plugin-root") ?? process.env.CLAUDE_PLUGIN_ROOT ?? null;

  switch (command) {
    case "validate": {
      if (!filePath) {
        console.error("Usage: composure-enforce validate <file>");
        process.exit(1);
      }
      const content = readContent(filePath);
      const result = validateCode(filePath, content);
      printViolations(result.violations, "BLOCKED");
      printViolations(result.warnings, "Warnings");
      process.exit(result.passed ? 0 : 2);
      break;
    }

    case "framework": {
      if (!filePath) {
        console.error("Usage: composure-enforce framework <file>");
        process.exit(1);
      }
      const content = readContent(filePath);
      const result = frameworkCheck(filePath, content, pluginRoot);
      printViolations(result.violations, "BLOCKED");
      printViolations(result.warnings, "Warnings");
      process.exit(result.passed ? 0 : 2);
      break;
    }

    case "quality": {
      if (!filePath) {
        console.error("Usage: composure-enforce quality <file>");
        process.exit(1);
      }
      const report = checkQuality(filePath);
      if (report) {
        console.log(JSON.stringify(report, null, 2));
      }
      process.exit(0);
      break;
    }

    case "rules": {
      const language = getArg("--language");
      const result = getRules(language ?? undefined);
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
      break;
    }

    case "all": {
      if (!filePath) {
        console.error("Usage: composure-enforce all <file>");
        process.exit(1);
      }
      const content = readContent(filePath);
      const result = validateAll(filePath, content, pluginRoot);
      printViolations(result.violations, "BLOCKED");
      printViolations(result.warnings, "Warnings");
      if (result.passed) {
        console.log("All checks passed.");
      }
      process.exit(result.passed ? 0 : 2);
      break;
    }

    case "adapt": {
      const platform = filePath as Platform;
      if (!platform || !["cursor", "windsurf", "cline", "git", "all"].includes(platform)) {
        console.error("Usage: composure-enforce adapt <cursor|windsurf|cline|git|all>");
        process.exit(1);
      }
      runAdapter(platform);
      break;
    }

    default:
      console.log("composure-enforce — Composure Enforcement Engine\n");
      console.log("Usage:");
      console.log("  composure-enforce validate <file>     Run no-bandaids rules");
      console.log("  composure-enforce framework <file>    Run framework validation");
      console.log("  composure-enforce quality <file>      Check code quality metrics");
      console.log("  composure-enforce rules [--language]  List enforcement rules");
      console.log("  composure-enforce all <file>          Run all checks");
      console.log("  composure-enforce adapt <platform>    Generate platform configs");
      console.log("    Platforms: cursor, windsurf, cline, git, all");
      console.log("\nExit codes: 0 = passed, 2 = violations found");
      break;
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
