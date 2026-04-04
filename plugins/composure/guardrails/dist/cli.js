#!/usr/bin/env node
/**
 * CLI transport for AIGRaaS Guardrails — Door 4.
 *
 * Usage:
 *   node cli.js evaluate '{"response":"...","user_input":"...","ruleset":"general"}'
 *   node cli.js prompt '{"ruleset":"healthcare","format":"vapi"}'
 *   node cli.js rulesets
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluate } from "./engine/engine.js";
import { generateSystemPrompt } from "./engine/prompt-generator.js";
const __dirname = dirname(fileURLToPath(import.meta.url));
function loadRuleset(name) {
    try {
        return JSON.parse(readFileSync(join(__dirname, "rulesets", `${name}.json`), "utf-8"));
    }
    catch {
        return null;
    }
}
const AVAILABLE = ["customer-service", "healthcare", "financial", "general"];
const commands = {
    evaluate: (args) => {
        const ruleset = args.ruleset_json
            ? JSON.parse(args.ruleset_json)
            : loadRuleset(args.ruleset ?? "general");
        if (!ruleset)
            return { status: "error", error: `Ruleset not found`, available: AVAILABLE };
        return { status: "ok", ...evaluate({ response: args.response, user_input: args.user_input, ruleset }) };
    },
    prompt: (args) => {
        const ruleset = args.ruleset_json
            ? JSON.parse(args.ruleset_json)
            : loadRuleset(args.ruleset ?? "general");
        if (!ruleset)
            return { status: "error", error: `Ruleset not found` };
        return { status: "ok", prompt: generateSystemPrompt(ruleset, args.format ?? "generic") };
    },
    rulesets: () => ({
        status: "ok",
        rulesets: AVAILABLE.map((name) => {
            const rs = loadRuleset(name);
            return { name, domain: rs?.domain?.name ?? name };
        }),
    }),
};
const command = process.argv[2];
if (!command || command === "--help") {
    console.error("Usage: guardrails-cli <command> [json-args]");
    console.error("Commands: evaluate, prompt, rulesets");
    process.exit(command ? 0 : 1);
}
const handler = commands[command];
if (!handler) {
    console.error(`Unknown command: ${command}. Available: ${Object.keys(commands).join(", ")}`);
    process.exit(1);
}
let args = {};
if (process.argv[3]) {
    try {
        args = JSON.parse(process.argv[3]);
    }
    catch {
        console.error(`Invalid JSON: ${process.argv[3]}`);
        process.exit(1);
    }
}
try {
    console.log(JSON.stringify(handler(args), null, 2));
}
catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
}
//# sourceMappingURL=cli.js.map