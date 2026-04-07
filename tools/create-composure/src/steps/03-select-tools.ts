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
  const detectedTools = Object.entries(detected)
    .filter(([, v]) => v.found)
    .map(([k]) => k);

  // Auto-apply to all detected tools — no menu needed
  // Only prompt if no tools detected (so user can pick manually)
  if (nonInteractive || detectedTools.length > 0) {
    return detectedTools;
  }

  const choices = [
    { title: "Claude Code CLI", value: "claude", selected: false },
    { title: "Cursor IDE", value: "cursor", selected: false },
    { title: "Windsurf", value: "windsurf", selected: false },
    { title: "Gemini CLI", value: "gemini", selected: false },
    { title: "Codex CLI", value: "codex", selected: false },
    { title: "Aider", value: "aider", selected: false },
    { title: "Cline (VS Code)", value: "cline", selected: false },
    { title: "Roo Code (VS Code)", value: "roo", selected: false },
  ];

  return promptMultiSelect("No AI tools auto-detected. Select which to configure:", choices);
}
