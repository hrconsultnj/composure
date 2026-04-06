/**
 * Step 03 — Interactive multi-select for which tools Composure should work with.
 * Pre-checks detected tools. Lets user add/remove.
 */

import type { DetectedTools } from "./02-detect-tools.js";
import { promptMultiSelect } from "../lib/prompts.js";

export async function selectTools(
  detected: DetectedTools,
  nonInteractive: boolean,
): Promise<string[]> {
  // In non-interactive mode, return all detected tools
  if (nonInteractive) {
    return Object.entries(detected)
      .filter(([, v]) => v.found)
      .map(([k]) => k);
  }

  const choices = [
    { title: "Claude Code CLI", value: "claude", selected: detected.claude.found },
    { title: "Cursor IDE", value: "cursor", selected: detected.cursor.found },
    { title: "Windsurf", value: "windsurf", selected: detected.windsurf.found },
    { title: "Gemini CLI", value: "gemini", selected: detected.gemini.found },
    { title: "Codex CLI", value: "codex", selected: detected.codex.found },
    { title: "Aider", value: "aider", selected: detected.aider.found },
    { title: "Cline (VS Code)", value: "cline", selected: detected.cline.found },
    { title: "Roo Code (VS Code)", value: "roo", selected: detected.roo.found },
  ];

  return promptMultiSelect("Which AI tools should Composure work with?", choices);
}
