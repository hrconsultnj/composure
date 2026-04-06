/**
 * Step 02 — Detect installed AI coding tools.
 * Ported from install.sh lines 81-147.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { commandExists, execSafeSync } from "../lib/exec.js";

export interface DetectedTools {
  claude: { found: boolean; version?: string };
  cursor: { found: boolean };
  windsurf: { found: boolean };
  gemini: { found: boolean };
  codex: { found: boolean };
  aider: { found: boolean };
  cline: { found: boolean };
  roo: { found: boolean };
}

export async function detectTools(): Promise<DetectedTools> {
  const home = homedir();
  const tools: DetectedTools = {
    claude: { found: false },
    cursor: { found: false },
    windsurf: { found: false },
    gemini: { found: false },
    codex: { found: false },
    aider: { found: false },
    cline: { found: false },
    roo: { found: false },
  };

  // Claude Code CLI
  if (commandExists("claude")) {
    const version = execSafeSync("claude", ["--version"]);
    tools.claude = { found: true, version: version || "installed" };
  }

  // Cursor IDE — binary or config directory
  if (commandExists("cursor") || existsSync(join(home, ".cursor"))) {
    tools.cursor = { found: true };
  }

  // Windsurf (Codeium) — binary or config directory
  if (commandExists("windsurf") || existsSync(join(home, ".codeium", "windsurf"))) {
    tools.windsurf = { found: true };
  }

  // Gemini CLI
  if (commandExists("gemini")) {
    tools.gemini = { found: true };
  }

  // Codex CLI
  if (commandExists("codex")) {
    tools.codex = { found: true };
  }

  // Aider
  if (commandExists("aider")) {
    tools.aider = { found: true };
  }

  // VS Code extensions: Cline and Roo Code
  if (commandExists("code")) {
    const extensions = execSafeSync("code", ["--list-extensions"]).toLowerCase();
    if (extensions.includes("saoudrizwan.claude-dev") || extensions.includes("cline")) {
      tools.cline = { found: true };
    }
    if (extensions.includes("roo-cline") || extensions.includes("rooveterinaryinc")) {
      tools.roo = { found: true };
    }
  }

  return tools;
}
