/**
 * Shell script parser for hook and script indexing.
 *
 * Parses .sh files using regex (no tree-sitter needed) to extract:
 * - Function definitions (function_name() { ... } or function name { ... })
 * - Source/dot-source imports (source ./path or . ./path)
 * - External command executions (node, python, npx, bash, etc.)
 * - File path references (explicit paths in the script)
 * - Environment variable reads ($VAR, ${VAR})
 *
 * Also parses hooks.json files to create edges from hook events → scripts.
 *
 * Node types emitted:
 * - File (the script itself, language: "bash")
 * - Function (shell functions defined in the script)
 * - Script (external commands/scripts called)
 *
 * Edge types:
 * - CONTAINS (File → Function)
 * - CALLS (Function → external command, or File → external command)
 * - IMPORTS_FROM (source/dot-source → another script)
 * - REFERENCES (script → file paths, env vars)
 */
import { readFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
// ── Detection ─────────────────────────────────────────────────────
export function isShParseable(filePath) {
    const ext = extname(filePath).toLowerCase();
    if (ext === ".sh")
        return true;
    // Also parse hooks.json files for hook→script edge mapping
    if (basename(filePath) === "hooks.json" && filePath.includes("/hooks/"))
        return true;
    return false;
}
// ── Helpers ───────────────────────────────────────────────────────
function qualify(name, filePath, parent) {
    return parent ? `${filePath}::${parent}.${name}` : `${filePath}::${name}`;
}
// ── Main parser ──────────────────────────────────────────────────
export function parseShFile(filePath) {
    if (basename(filePath) === "hooks.json") {
        return parseHooksJson(filePath);
    }
    return parseShellScript(filePath);
}
// ── Shell script parser ──────────────────────────────────────────
function parseShellScript(filePath) {
    let content;
    try {
        content = readFileSync(filePath, "utf-8");
    }
    catch {
        return { nodes: [], edges: [] };
    }
    const nodes = [];
    const edges = [];
    const lines = content.split("\n");
    const totalLines = lines.length;
    const name = basename(filePath);
    // Detect script purpose from header comment or filename
    const purpose = detectPurpose(filePath, content);
    const isHook = filePath.includes("/hooks/") || purpose === "hook";
    // File node
    nodes.push({
        kind: "File",
        name,
        file_path: filePath,
        line_start: 1,
        line_end: totalLines,
        language: "bash",
        is_test: false,
        extra: {
            scriptType: isHook ? "hook" : "script",
            purpose,
            hasSetE: content.includes("set -e") || content.includes("set -euo"),
            hasPipefail: content.includes("pipefail"),
            usesJq: content.includes("jq ") || content.includes("jq -"),
            readsStdin: content.includes("$(cat)") || content.includes("read "),
        },
    });
    // Track current function for CALLS edge scoping
    let currentFunc = null;
    let funcStartLine = 0;
    let braceDepth = 0;
    let inFunction = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const lineNum = i + 1;
        // Skip comments and empty lines for structural parsing
        if (trimmed.startsWith("#") || trimmed === "")
            continue;
        // ── Function definitions ──────────────────────────────────
        // Patterns: name() {  |  function name {  |  function name() {
        const funcMatch = trimmed.match(/^(?:function\s+)?(\w+)\s*\(\s*\)\s*\{?\s*$|^function\s+(\w+)\s*\{?\s*$/);
        if (funcMatch) {
            const funcName = funcMatch[1] ?? funcMatch[2];
            if (funcName && !isBuiltinKeyword(funcName)) {
                // Find the closing brace for this function
                const funcEnd = findFunctionEnd(lines, i);
                nodes.push({
                    kind: "Function",
                    name: funcName,
                    file_path: filePath,
                    line_start: lineNum,
                    line_end: funcEnd,
                    language: "bash",
                    parent_name: undefined,
                    is_test: false,
                    extra: { shellFunction: true },
                });
                edges.push({
                    kind: "CONTAINS",
                    source: filePath,
                    target: qualify(funcName, filePath, null),
                    file_path: filePath,
                    line: lineNum,
                });
                currentFunc = funcName;
                funcStartLine = lineNum;
                inFunction = true;
                braceDepth = 1;
                continue;
            }
        }
        // Track brace depth for function scope
        if (inFunction) {
            for (const ch of trimmed) {
                if (ch === "{")
                    braceDepth++;
                if (ch === "}")
                    braceDepth--;
            }
            if (braceDepth <= 0) {
                currentFunc = null;
                inFunction = false;
            }
        }
        // ── Source/dot-source imports ────────────────────────────
        // Patterns: source ./path  |  . ./path  |  source "${DIR}/file.sh"
        const sourceMatch = trimmed.match(/^(?:source|\.)\s+["']?([^"'\s;#]+)["']?/);
        if (sourceMatch) {
            const sourcePath = resolveShellPath(sourceMatch[1], filePath);
            edges.push({
                kind: "IMPORTS_FROM",
                source: filePath,
                target: sourcePath,
                file_path: filePath,
                line: lineNum,
            });
            continue;
        }
        // ── External script/command executions ───────────────────
        // Detect: bash script.sh, node script.js, python script.py, npx ..., etc.
        const execMatch = trimmed.match(/\b(bash|sh|node|python3?|ruby|npx|pnpm|npm|yarn|go\s+run|cargo\s+run)\s+["']?([^"'\s;#|&]+)/);
        if (execMatch) {
            const command = execMatch[1];
            const target = execMatch[2];
            const caller = currentFunc
                ? qualify(currentFunc, filePath, null)
                : filePath;
            // If it looks like a file path (has extension or starts with ./ or $)
            if (target.match(/\.\w+$|^[.$/]/)) {
                const resolvedTarget = resolveShellPath(target, filePath);
                edges.push({
                    kind: "CALLS",
                    source: caller,
                    target: resolvedTarget,
                    file_path: filePath,
                    line: lineNum,
                    extra: { via: command },
                });
            }
        }
        // ── File path references ────────────────────────────────
        // Detect explicit file paths: "./foo/bar.sh", "${DIR}/file.ts", etc.
        const pathRefs = trimmed.matchAll(/["']([./][\w/.${}-]+\.(?:sh|ts|js|json|py|go|rs|yaml|yml|toml|sql))\b["']?/g);
        for (const match of pathRefs) {
            const refPath = match[1];
            // Skip if it's just a glob pattern
            if (refPath.includes("*"))
                continue;
            const resolvedRef = resolveShellPath(refPath, filePath);
            const caller = currentFunc
                ? qualify(currentFunc, filePath, null)
                : filePath;
            edges.push({
                kind: "REFERENCES",
                source: caller,
                target: resolvedRef,
                file_path: filePath,
                line: lineNum,
                extra: { type: "file-reference" },
            });
        }
    }
    return { nodes, edges };
}
// ── hooks.json parser ────────────────────────────────────────────
function parseHooksJson(filePath) {
    let content;
    try {
        content = readFileSync(filePath, "utf-8");
    }
    catch {
        return { nodes: [], edges: [] };
    }
    let config;
    try {
        config = JSON.parse(content);
    }
    catch {
        return { nodes: [], edges: [] };
    }
    const nodes = [];
    const edges = [];
    const lines = content.split("\n");
    const name = basename(filePath);
    nodes.push({
        kind: "File",
        name,
        file_path: filePath,
        line_start: 1,
        line_end: lines.length,
        language: "json",
        is_test: false,
        extra: { configType: "hooks" },
    });
    if (!config.hooks)
        return { nodes, edges };
    for (const [eventType, matchers] of Object.entries(config.hooks)) {
        if (!Array.isArray(matchers))
            continue;
        for (const matcherGroup of matchers) {
            const matcher = matcherGroup.matcher ?? "*";
            const hookList = matcherGroup.hooks ?? [];
            for (const hook of hookList) {
                if (hook.type !== "command" || !hook.command)
                    continue;
                // Extract script path from command string
                // Pattern: bash "${CLAUDE_PLUGIN_ROOT}/hooks/script.sh" ...
                //   or:    bash "$PLUGIN_ROOT/hooks/script.sh" ...
                //   or:    node dist/update.js ...
                const scriptMatch = hook.command.match(/(?:bash|sh|node|python3?)\s+["']?(?:\$\{?\w+\}?\/)?([^"'\s]+\.(?:sh|js|py|ts))["']?/);
                if (scriptMatch) {
                    const scriptRelPath = scriptMatch[1];
                    const hooksDir = dirname(filePath);
                    const pluginRoot = dirname(hooksDir);
                    const scriptAbsPath = resolve(pluginRoot, scriptRelPath);
                    // Create a Script node for the hook binding
                    const hookName = `${eventType}:${matcher}→${basename(scriptRelPath)}`;
                    nodes.push({
                        kind: "Script",
                        name: hookName,
                        file_path: filePath,
                        line_start: findLineInContent(content, scriptRelPath),
                        line_end: findLineInContent(content, scriptRelPath),
                        language: "json",
                        is_test: false,
                        extra: {
                            hookEvent: eventType,
                            hookMatcher: matcher,
                            scriptPath: scriptRelPath,
                        },
                    });
                    edges.push({
                        kind: "CONTAINS",
                        source: filePath,
                        target: qualify(hookName, filePath, null),
                        file_path: filePath,
                        line: findLineInContent(content, scriptRelPath),
                    });
                    // Edge: this hook config → the script it executes
                    edges.push({
                        kind: "CALLS",
                        source: qualify(hookName, filePath, null),
                        target: scriptAbsPath,
                        file_path: filePath,
                        line: findLineInContent(content, scriptRelPath),
                        extra: {
                            hookEvent: eventType,
                            hookMatcher: matcher,
                        },
                    });
                }
            }
        }
    }
    return { nodes, edges };
}
// ── Utility functions ────────────────────────────────────────────
function findFunctionEnd(lines, startLine) {
    let depth = 0;
    let foundOpen = false;
    for (let i = startLine; i < lines.length; i++) {
        const line = lines[i];
        for (const ch of line) {
            if (ch === "{") {
                depth++;
                foundOpen = true;
            }
            if (ch === "}")
                depth--;
        }
        if (foundOpen && depth <= 0)
            return i + 1;
    }
    return lines.length;
}
function resolveShellPath(raw, fromFile) {
    // Handle ${CLAUDE_PLUGIN_ROOT}/... or $CLAUDE_PLUGIN_ROOT/...
    if (raw.includes("CLAUDE_PLUGIN_ROOT") || raw.includes("PLUGIN_ROOT")) {
        // Can't resolve env vars at parse time — return the raw pattern
        return raw;
    }
    // Handle relative paths
    if (raw.startsWith("./") || raw.startsWith("../")) {
        return resolve(dirname(fromFile), raw);
    }
    // Handle ${DIR}/... or $DIR/... — return as-is (can't resolve)
    if (raw.startsWith("$"))
        return raw;
    // Absolute paths
    if (raw.startsWith("/"))
        return raw;
    // Bare filenames — resolve relative to script's directory
    return resolve(dirname(fromFile), raw);
}
function detectPurpose(filePath, content) {
    const name = basename(filePath, ".sh").toLowerCase();
    const firstLines = content.slice(0, 500).toLowerCase();
    if (filePath.includes("/hooks/"))
        return "hook";
    if (name.includes("init") || name.includes("setup"))
        return "initialization";
    if (name.includes("build") || name.includes("compile"))
        return "build";
    if (name.includes("test") || name.includes("spec"))
        return "test";
    if (name.includes("deploy") || name.includes("release"))
        return "deployment";
    if (name.includes("lint") || name.includes("check") || name.includes("guard"))
        return "guard";
    if (name.includes("generate") || name.includes("scaffold"))
        return "codegen";
    if (name.includes("sync") || name.includes("update"))
        return "sync";
    if (firstLines.includes("pretooluse") || firstLines.includes("posttooluse"))
        return "hook";
    return "utility";
}
function isBuiltinKeyword(name) {
    const BUILTINS = new Set([
        "if", "then", "else", "elif", "fi", "for", "while", "do", "done",
        "case", "esac", "in", "select", "until", "coproc", "time",
    ]);
    return BUILTINS.has(name);
}
function findLineInContent(content, needle) {
    const idx = content.indexOf(needle);
    if (idx < 0)
        return 1;
    let line = 1;
    for (let i = 0; i < idx; i++) {
        if (content[i] === "\n")
            line++;
    }
    return line;
}
//# sourceMappingURL=sh-parser.js.map