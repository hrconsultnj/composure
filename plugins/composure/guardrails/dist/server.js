#!/usr/bin/env node
/**
 * MCP STDIO server for AIGRaaS Guardrails — Door 1.
 *
 * Registers evaluation, prompt generation, and ruleset tools.
 * The engine is stateless — no adapter layer needed.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluate } from "./engine/engine.js";
import { generateSystemPrompt } from "./engine/prompt-generator.js";
// Load pre-built rulesets
const __dirname = dirname(fileURLToPath(import.meta.url));
function loadRuleset(name) {
    try {
        const path = join(__dirname, "rulesets", `${name}.json`);
        return JSON.parse(readFileSync(path, "utf-8"));
    }
    catch {
        return null;
    }
}
const AVAILABLE_RULESETS = ["customer-service", "healthcare", "financial", "general"];
const server = new McpServer({
    name: "composure-guardrails",
    version: "0.1.0",
});
// ── Tools ────────────────────────────────────────────────────────
server.tool("evaluate_response", `Evaluate an AI agent's response against a guardrails ruleset. Runs 5 decision trees in <10ms:
1. Hard constraints (absolute safety checks)
2. Topic classification (on-topic / restricted)
3. Principal hierarchy (operator vs user conflict resolution)
4. Harm assessment (8-variable scoring + 1000 Users Test)
5. Verdict (Senior Employee Test + Dual Newspaper Test)

Returns: verdict (pass/redirect/modify/block), reason, suggestion, full decision path.`, {
    response: z.string().describe("The AI agent's generated response to evaluate."),
    user_input: z.string().describe("The user's original input/message."),
    ruleset_name: z.string().optional().describe("Pre-built ruleset: customer-service, healthcare, financial, general."),
    ruleset_json: z.string().optional().describe("Custom ruleset as JSON string. Overrides ruleset_name."),
}, async ({ response, user_input, ruleset_name, ruleset_json }) => {
    let ruleset = null;
    if (ruleset_json) {
        try {
            ruleset = JSON.parse(ruleset_json);
        }
        catch {
            return { content: [{ type: "text", text: JSON.stringify({ status: "error", error: "Invalid ruleset_json" }) }] };
        }
    }
    else {
        ruleset = loadRuleset(ruleset_name ?? "general");
    }
    if (!ruleset) {
        return { content: [{ type: "text", text: JSON.stringify({ status: "error", error: `Ruleset not found: ${ruleset_name}`, available: AVAILABLE_RULESETS }) }] };
    }
    const result = evaluate({ response, user_input, ruleset });
    return { content: [{ type: "text", text: JSON.stringify({ status: "ok", ...result }, null, 2) }] };
});
server.tool("generate_prompt", "Generate optimized system prompt sections from a guardrails ruleset. Zero latency — guardrails are 'baked in' to the prompt. Supports platform-specific formats.", {
    ruleset_name: z.string().optional().describe("Pre-built ruleset name. Default: general."),
    ruleset_json: z.string().optional().describe("Custom ruleset as JSON string."),
    format: z.enum(["generic", "vapi", "11labs", "bland"]).optional().describe("Platform-specific prompt format. Default: generic."),
}, async ({ ruleset_name, ruleset_json, format }) => {
    let ruleset = null;
    if (ruleset_json) {
        try {
            ruleset = JSON.parse(ruleset_json);
        }
        catch {
            return { content: [{ type: "text", text: JSON.stringify({ status: "error", error: "Invalid ruleset_json" }) }] };
        }
    }
    else {
        ruleset = loadRuleset(ruleset_name ?? "general");
    }
    if (!ruleset) {
        return { content: [{ type: "text", text: JSON.stringify({ status: "error", error: `Ruleset not found: ${ruleset_name}` }) }] };
    }
    const prompt = generateSystemPrompt(ruleset, format ?? "generic");
    return { content: [{ type: "text", text: JSON.stringify({ status: "ok", format: format ?? "generic", prompt }, null, 2) }] };
});
server.tool("load_ruleset", "Load a pre-built guardrails ruleset by name. Returns the full ruleset JSON for inspection or modification.", {
    name: z.enum(["customer-service", "healthcare", "financial", "general"]).describe("Ruleset name."),
}, async ({ name }) => {
    const ruleset = loadRuleset(name);
    if (!ruleset) {
        return { content: [{ type: "text", text: JSON.stringify({ status: "error", error: `Ruleset not found: ${name}` }) }] };
    }
    return { content: [{ type: "text", text: JSON.stringify({ status: "ok", ruleset }, null, 2) }] };
});
server.tool("list_rulesets", "List all available pre-built guardrails rulesets.", {}, async () => {
    const rulesets = AVAILABLE_RULESETS.map((name) => {
        const rs = loadRuleset(name);
        return { name, domain: rs?.domain?.name ?? name, description: rs?.domain?.description ?? "" };
    });
    return { content: [{ type: "text", text: JSON.stringify({ status: "ok", rulesets }, null, 2) }] };
});
// ── Start ────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
//# sourceMappingURL=server.js.map