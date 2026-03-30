/**
 * Configuration file parser for project config indexing.
 *
 * Extracts key settings from:
 * - tsconfig.json — paths, strict mode, target, module resolution
 * - next.config.* — experimental flags, redirects
 * - tailwind.config.* — theme extensions, plugins, content paths
 * - .env.example / .env.local — environment variable names (never values)
 * - vercel.json — deployment config
 *
 * Returns NodeInfo/EdgeInfo for graph storage.
 */
import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
// ── Detection ─────────────────────────────────────────────────────
const CONFIG_FILENAMES = new Set([
    "tsconfig.json",
    "tsconfig.base.json",
    "tsconfig.app.json",
    ".env.example",
    ".env.local.example",
    ".env.template",
    "vercel.json",
]);
const CONFIG_PREFIXES = [
    "next.config",
    "tailwind.config",
];
export function isConfigParseable(filePath) {
    const name = basename(filePath);
    if (CONFIG_FILENAMES.has(name))
        return true;
    for (const prefix of CONFIG_PREFIXES) {
        if (name.startsWith(prefix))
            return true;
    }
    // .env files (but not .env itself — only examples/templates)
    if (/^\.env\.(example|template|local\.example|sample)$/.test(name))
        return true;
    return false;
}
// ── Helpers ───────────────────────────────────────────────────────
function qualify(name, filePath, parent) {
    return parent ? `${filePath}::${parent}.${name}` : `${filePath}::${name}`;
}
function lineCount(content) {
    return content.split("\n").length;
}
function findLine(content, needle) {
    const idx = content.indexOf(needle);
    if (idx < 0)
        return 0;
    let line = 1;
    for (let i = 0; i < idx; i++) {
        if (content[i] === "\n")
            line++;
    }
    return line;
}
// ── JSON comment stripper (string-boundary aware) ─────────────────
function stripJsonComments(input) {
    let result = "";
    let i = 0;
    const len = input.length;
    while (i < len) {
        // Inside a string — pass through including any // or /*
        if (input[i] === '"') {
            result += '"';
            i++;
            while (i < len && input[i] !== '"') {
                if (input[i] === "\\") {
                    result += input[i] + (input[i + 1] ?? "");
                    i += 2;
                }
                else {
                    result += input[i];
                    i++;
                }
            }
            if (i < len) {
                result += '"';
                i++;
            }
            continue;
        }
        // Line comment — skip to end of line
        if (input[i] === "/" && input[i + 1] === "/") {
            while (i < len && input[i] !== "\n")
                i++;
            continue;
        }
        // Block comment — skip to */
        if (input[i] === "/" && input[i + 1] === "*") {
            i += 2;
            while (i < len && !(input[i] === "*" && input[i + 1] === "/"))
                i++;
            i += 2;
            continue;
        }
        result += input[i];
        i++;
    }
    // Also strip trailing commas
    return result.replace(/,(\s*[}\]])/g, "$1");
}
// ── Main parser ───────────────────────────────────────────────────
export function parseConfigFile(filePath) {
    let content;
    try {
        content = readFileSync(filePath, "utf-8");
    }
    catch {
        return { nodes: [], edges: [] };
    }
    const name = basename(filePath);
    if (name.startsWith("tsconfig"))
        return parseTsConfig(filePath, content);
    if (name.startsWith("next.config"))
        return parseNextConfig(filePath, content);
    if (name.startsWith("tailwind.config"))
        return parseTailwindConfig(filePath, content);
    if (name.startsWith(".env"))
        return parseEnvFile(filePath, content);
    if (name === "vercel.json")
        return parseVercelJson(filePath, content);
    return { nodes: [], edges: [] };
}
// ── tsconfig.json parser ──────────────────────────────────────────
function parseTsConfig(filePath, content) {
    const nodes = [];
    const edges = [];
    const lines = lineCount(content);
    let config;
    try {
        config = JSON.parse(stripJsonComments(content));
    }
    catch {
        return { nodes: [], edges: [] };
    }
    const compilerOptions = (config.compilerOptions ?? {});
    nodes.push({
        kind: "File",
        name: basename(filePath),
        file_path: filePath,
        line_start: 1,
        line_end: lines,
        language: "json",
        is_test: false,
        extra: {
            configType: "tsconfig",
            strict: compilerOptions.strict ?? false,
            target: compilerOptions.target ?? null,
            module: compilerOptions.module ?? null,
            moduleResolution: compilerOptions.moduleResolution ?? null,
            jsx: compilerOptions.jsx ?? null,
            extends: config.extends ?? null,
            paths: compilerOptions.paths ? Object.keys(compilerOptions.paths) : [],
            include: config.include ?? [],
            exclude: config.exclude ?? [],
        },
    });
    // Path aliases as Type nodes (they define import mappings)
    const paths = compilerOptions.paths;
    if (paths) {
        for (const [alias, targets] of Object.entries(paths)) {
            nodes.push({
                kind: "Type",
                name: alias,
                file_path: filePath,
                line_start: findLine(content, `"${alias}"`),
                line_end: findLine(content, `"${alias}"`),
                language: "json",
                parent_name: "tsconfig",
                return_type: Array.isArray(targets) ? targets[0] : String(targets),
                is_test: false,
                extra: { configType: "path-alias", targets },
            });
            edges.push({
                kind: "CONTAINS",
                source: filePath,
                target: qualify(alias, filePath, "tsconfig"),
                file_path: filePath,
                line: findLine(content, `"${alias}"`),
            });
        }
    }
    // If extends another config, create a DEPENDS_ON edge
    if (config.extends) {
        edges.push({
            kind: "DEPENDS_ON",
            source: filePath,
            target: `config::${config.extends}`,
            file_path: filePath,
            line: findLine(content, `"extends"`),
            extra: { type: "extends" },
        });
    }
    return { nodes, edges };
}
// ── next.config.* parser ──────────────────────────────────────────
function parseNextConfig(filePath, content) {
    const nodes = [];
    const edges = [];
    const lines = lineCount(content);
    // Extract key patterns via regex (works on both .js, .mjs, .ts)
    const experimental = content.match(/experimental\s*:\s*\{([^}]*)\}/s);
    const experimentalFlags = [];
    if (experimental) {
        const flagMatches = experimental[1].matchAll(/(\w+)\s*:\s*true/g);
        for (const m of flagMatches)
            experimentalFlags.push(m[1]);
    }
    // Detect features
    const hasImages = /images\s*:/i.test(content);
    const hasRedirects = /redirects\s*\(/i.test(content) || /redirects\s*:/i.test(content);
    const hasHeaders = /headers\s*\(/i.test(content) || /headers\s*:/i.test(content);
    const hasRewrites = /rewrites\s*\(/i.test(content) || /rewrites\s*:/i.test(content);
    const hasWebpack = /webpack\s*\(/i.test(content) || /webpack\s*:/i.test(content);
    const hasTurbopack = /turbopack/i.test(content);
    const hasOutput = content.match(/output\s*:\s*['"](\w+)['"]/);
    nodes.push({
        kind: "File",
        name: basename(filePath),
        file_path: filePath,
        line_start: 1,
        line_end: lines,
        language: extname(filePath) === ".ts" ? "typescript" : "javascript",
        is_test: false,
        extra: {
            configType: "next.config",
            experimentalFlags,
            hasImages,
            hasRedirects,
            hasHeaders,
            hasRewrites,
            hasWebpack,
            hasTurbopack,
            output: hasOutput?.[1] ?? null,
        },
    });
    return { nodes, edges };
}
// ── tailwind.config.* parser ──────────────────────────────────────
function parseTailwindConfig(filePath, content) {
    const nodes = [];
    const edges = [];
    const lines = lineCount(content);
    // Extract content paths
    const contentPaths = [];
    const contentMatch = content.match(/content\s*:\s*\[([\s\S]*?)\]/);
    if (contentMatch) {
        const pathMatches = contentMatch[1].matchAll(/['"]([^'"]+)['"]/g);
        for (const m of pathMatches)
            contentPaths.push(m[1]);
    }
    // Detect plugins
    const plugins = [];
    const pluginMatch = content.match(/plugins\s*:\s*\[([\s\S]*?)\]/);
    if (pluginMatch) {
        const pluginMatches = pluginMatch[1].matchAll(/require\(['"]([^'"]+)['"]\)|(\w+)\(/g);
        for (const m of pluginMatches)
            plugins.push(m[1] ?? m[2]);
    }
    // Detect theme extensions
    const hasExtend = /extend\s*:/i.test(content);
    const hasCustomColors = /colors\s*:/i.test(content);
    const hasCustomFonts = /fontFamily\s*:/i.test(content);
    nodes.push({
        kind: "File",
        name: basename(filePath),
        file_path: filePath,
        line_start: 1,
        line_end: lines,
        language: extname(filePath) === ".ts" ? "typescript" : "javascript",
        is_test: false,
        extra: {
            configType: "tailwind.config",
            contentPaths,
            plugins,
            hasExtend,
            hasCustomColors,
            hasCustomFonts,
        },
    });
    return { nodes, edges };
}
// ── .env file parser ──────────────────────────────────────────────
function parseEnvFile(filePath, content) {
    const nodes = [];
    const edges = [];
    const lines = lineCount(content);
    nodes.push({
        kind: "File",
        name: basename(filePath),
        file_path: filePath,
        line_start: 1,
        line_end: lines,
        language: "env",
        is_test: false,
        extra: { configType: "env" },
    });
    // Extract variable names (NEVER store values)
    const envVars = [];
    const contentLines = content.split("\n");
    for (let i = 0; i < contentLines.length; i++) {
        const line = contentLines[i].trim();
        if (!line || line.startsWith("#"))
            continue;
        const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (!match)
            continue;
        const varName = match[1];
        const value = match[2];
        const hasDefault = value.length > 0 && value !== '""' && value !== "''";
        const lineNum = i + 1;
        envVars.push({ name: varName, line: lineNum, hasDefault });
        nodes.push({
            kind: "Type",
            name: varName,
            file_path: filePath,
            line_start: lineNum,
            line_end: lineNum,
            language: "env",
            parent_name: "env",
            is_test: false,
            extra: {
                configType: "env-var",
                hasDefault,
                isPublic: varName.startsWith("NEXT_PUBLIC_") || varName.startsWith("EXPO_PUBLIC_"),
                category: categorizeEnvVar(varName),
            },
        });
        edges.push({
            kind: "CONTAINS",
            source: filePath,
            target: qualify(varName, filePath, "env"),
            file_path: filePath,
            line: lineNum,
        });
    }
    return { nodes, edges };
}
function categorizeEnvVar(name) {
    if (/SUPABASE/i.test(name))
        return "supabase";
    if (/DATABASE|DB_|POSTGRES/i.test(name))
        return "database";
    if (/AUTH|SECRET|JWT|SESSION/i.test(name))
        return "auth";
    if (/STRIPE|PAYMENT/i.test(name))
        return "payment";
    if (/REDIS|CACHE/i.test(name))
        return "cache";
    if (/SMTP|EMAIL|RESEND|SENDGRID/i.test(name))
        return "email";
    if (/API_KEY|API_SECRET|TOKEN/i.test(name))
        return "api-key";
    if (/S3|STORAGE|BUCKET|CLOUDINARY/i.test(name))
        return "storage";
    if (/NEXT_PUBLIC_|EXPO_PUBLIC_/i.test(name))
        return "public";
    if (/URL|HOST|PORT|DOMAIN/i.test(name))
        return "connection";
    return "other";
}
// ── vercel.json parser ────────────────────────────────────────────
function parseVercelJson(filePath, content) {
    const nodes = [];
    const lines = lineCount(content);
    let config;
    try {
        config = JSON.parse(content);
    }
    catch {
        return { nodes: [], edges: [] };
    }
    nodes.push({
        kind: "File",
        name: basename(filePath),
        file_path: filePath,
        line_start: 1,
        line_end: lines,
        language: "json",
        is_test: false,
        extra: {
            configType: "vercel",
            framework: config.framework ?? null,
            buildCommand: config.buildCommand ?? null,
            outputDirectory: config.outputDirectory ?? null,
            hasRewrites: !!config.rewrites,
            hasRedirects: !!config.redirects,
            hasHeaders: !!config.headers,
            hasCrons: !!config.crons,
            regions: config.regions ?? [],
        },
    });
    return { nodes, edges: [] };
}
//# sourceMappingURL=config-parser.js.map