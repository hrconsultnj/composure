/**
 * Step 04 — Offer to install Claude Code CLI if not found.
 */

import { platform } from "node:os";
import { execFileSync } from "node:child_process";
import { logger } from "../lib/logger.js";
import { promptConfirm } from "../lib/prompts.js";
import { commandExists } from "../lib/exec.js";

export async function installClaude(options: {
  skipClaude: boolean;
  nonInteractive: boolean;
  selectedTools: string[];
}): Promise<boolean> {
  // Skip if not selected or flag set
  if (options.skipClaude || !options.selectedTools.includes("claude")) {
    return false;
  }

  // Already installed
  if (commandExists("claude")) {
    return false;
  }

  const os = platform();

  if (os === "win32") {
    logger.info("Install Claude Code for Windows:");
    logger.info("  https://claude.ai/download");
    return false;
  }

  if (options.nonInteractive) {
    logger.info("Claude Code not found. Install manually: curl -fsSL https://claude.ai/install.sh | bash");
    return false;
  }

  const install = await promptConfirm("Install Claude Code CLI now?");
  if (!install) {
    logger.info("Skipped. Install later: curl -fsSL https://claude.ai/install.sh | bash");
    return false;
  }

  try {
    // Use bash -c to run the installer (this is the one shell invocation we allow)
    execFileSync("bash", ["-c", "curl -fsSL https://claude.ai/install.sh | bash"], {
      stdio: "inherit",
    });

    if (commandExists("claude")) {
      return true;
    }

    logger.warn("Claude Code may need a shell restart to appear on PATH");
    return false;
  } catch {
    logger.warn("Claude Code installation failed. Install manually later.");
    return false;
  }
}
