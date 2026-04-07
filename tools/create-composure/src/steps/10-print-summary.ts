/**
 * Step 10 — Print installation summary and next steps.
 */

import kleur from "kleur";

export interface SummaryData {
  selectedTools: string[];
  installedPlugins: string[];
  authenticated: boolean;
  email?: string;
  plan?: string;
  composureHome: string;
  linkedBinaries: number;
  generatedAdapters: string[];
  claudeInstalled: boolean;
}

const TOOL_LABELS: Record<string, string> = {
  claude: "Claude Code",
  cursor: "Cursor",
  windsurf: "Windsurf",
  gemini: "Gemini CLI",
  codex: "Codex CLI",
  aider: "Aider",
  cline: "Cline",
  roo: "Roo Code",
};

export function printSummary(data: SummaryData): void {
  const toolNames = data.selectedTools.map((t) => TOOL_LABELS[t] ?? t).join(", ");
  const pluginNames = data.installedPlugins.join(", ");
  const authStatus = data.authenticated
    ? `${kleur.green("authenticated")}${data.email ? ` as ${data.email}` : ""}${data.plan ? ` (${data.plan} plan)` : ""}`
    : "not yet (run /composure:auth login)";

  console.log(`
${kleur.green().bold("Composure Suite installed")}

  ${kleur.bold("Tools configured:")}   ${toolNames || "none selected"}
  ${kleur.bold("Suite:")}              ${pluginNames || (data.claudeInstalled ? "none (check claude plugin install)" : "pending (install Claude Code first)")}
  ${kleur.bold("Auth:")}               ${authStatus}
  ${kleur.bold("Global home:")}        ${kleur.cyan(data.composureHome)}

  ${kleur.gray("Composure (orchestration, code graph, Cortex memory)")}
  ${kleur.gray("+ Sentinel (security) + Shipyard (CI/CD) + Testbench (testing)")}
  ${kleur.gray("+ Design Forge (ux-researcher, product-planner, ui-designer)")}
`);

  if (data.generatedAdapters.length > 0) {
    const adapterList = data.generatedAdapters.map((a) => TOOL_LABELS[a] ?? a).join(", ");
    console.log(`  ${kleur.bold("Adapters:")}           ${adapterList}`);
    console.log();
  }

  console.log(kleur.bold("  Next steps:"));

  const steps: string[] = [];

  if (!data.claudeInstalled) {
    steps.push("Install Claude Code: curl -fsSL https://claude.ai/install.sh | bash");
  }

  if (!data.authenticated) {
    if (data.claudeInstalled) {
      steps.push("Open Claude Code and run /composure:auth login");
    } else {
      steps.push("After installing Claude Code, run /composure:auth login");
    }
  }

  steps.push("Open any project in Claude Code — the full suite auto-initializes");
  steps.push("Run /composure:health to verify everything is working");

  for (const [i, step] of steps.entries()) {
    console.log(`    ${kleur.bold(`${i + 1}.`)} ${step}`);
  }

  console.log(`
  ${kleur.gray("Docs: https://composure-pro.com/docs")}
`);
}
