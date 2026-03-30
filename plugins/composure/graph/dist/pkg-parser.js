/**
 * Package.json parser for dependency graph indexing.
 *
 * Extracts structural information from package.json files:
 * - Package identity (name, version)
 * - Dependencies (prod, dev, peer) as DEPENDS_ON edges
 * - Scripts as Script nodes
 * - Workspace definitions (monorepo detection)
 *
 * Also handles pnpm-workspace.yaml and turbo.json for monorepo mapping.
 */
import { readFileSync, existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
// ── Detection ─────────────────────────────────────────────────────
const PKG_FILES = new Set(["package.json"]);
const WORKSPACE_FILES = new Set(["pnpm-workspace.yaml", "turbo.json"]);
export function isPkgParseable(filePath) {
    const name = basename(filePath);
    return PKG_FILES.has(name) || WORKSPACE_FILES.has(name);
}
// ── Helpers ───────────────────────────────────────────────────────
function qualify(name, filePath, parent) {
    return parent ? `${filePath}::${parent}.${name}` : `${filePath}::${name}`;
}
function lineCount(content) {
    return content.split("\n").length;
}
// ── Main parser ───────────────────────────────────────────────────
export function parsePkgFile(filePath) {
    let content;
    try {
        content = readFileSync(filePath, "utf-8");
    }
    catch {
        return { nodes: [], edges: [] };
    }
    const name = basename(filePath);
    if (name === "package.json") {
        return parsePackageJson(filePath, content);
    }
    if (name === "pnpm-workspace.yaml") {
        return parsePnpmWorkspace(filePath, content);
    }
    if (name === "turbo.json") {
        return parseTurboJson(filePath, content);
    }
    return { nodes: [], edges: [] };
}
// ── package.json parser ───────────────────────────────────────────
function parsePackageJson(filePath, content) {
    const nodes = [];
    const edges = [];
    const lines = lineCount(content);
    let pkg;
    try {
        pkg = JSON.parse(content);
    }
    catch {
        return { nodes: [], edges: [] };
    }
    const pkgName = pkg.name ?? basename(dirname(filePath));
    const pkgVersion = pkg.version ?? "0.0.0";
    // Is this a workspace root?
    const isWorkspaceRoot = !!pkg.workspaces;
    const isMonorepoRoot = isWorkspaceRoot || existsSync(join(dirname(filePath), "turbo.json"));
    // Package node
    nodes.push({
        kind: isMonorepoRoot ? "Workspace" : "Package",
        name: pkgName,
        file_path: filePath,
        line_start: 1,
        line_end: lines,
        language: "json",
        return_type: pkgVersion,
        is_test: false,
        extra: {
            version: pkgVersion,
            private: pkg.private ?? false,
            isWorkspaceRoot: isMonorepoRoot,
            depCount: Object.keys(pkg.dependencies ?? {}).length,
            devDepCount: Object.keys(pkg.devDependencies ?? {}).length,
            peerDepCount: Object.keys(pkg.peerDependencies ?? {}).length,
        },
    });
    // File node
    nodes.push({
        kind: "File",
        name: basename(filePath),
        file_path: filePath,
        line_start: 1,
        line_end: lines,
        language: "json",
        is_test: false,
    });
    edges.push({
        kind: "CONTAINS",
        source: filePath,
        target: qualify(pkgName, filePath, null),
        file_path: filePath,
        line: 1,
    });
    // Dependencies → DEPENDS_ON edges
    parseDeps(pkg.dependencies, "production", pkgName, filePath, nodes, edges);
    parseDeps(pkg.devDependencies, "development", pkgName, filePath, nodes, edges);
    parseDeps(pkg.peerDependencies, "peer", pkgName, filePath, nodes, edges);
    // Scripts → Script nodes
    if (pkg.scripts) {
        for (const [scriptName, scriptCmd] of Object.entries(pkg.scripts)) {
            nodes.push({
                kind: "Script",
                name: scriptName,
                file_path: filePath,
                line_start: findJsonLine(content, `"${scriptName}"`),
                line_end: findJsonLine(content, `"${scriptName}"`),
                language: "json",
                parent_name: pkgName,
                params: scriptCmd,
                is_test: /test|spec|jest|vitest|playwright/i.test(scriptName),
                extra: {
                    command: scriptCmd,
                    isTypeGen: /generate|gen\s+types|codegen|prisma\s+generate/i.test(scriptCmd),
                    isBuild: /^build$/i.test(scriptName),
                    isLint: /lint|eslint/i.test(scriptName),
                },
            });
            edges.push({
                kind: "CONTAINS",
                source: qualify(pkgName, filePath, null),
                target: qualify(scriptName, filePath, pkgName),
                file_path: filePath,
                line: findJsonLine(content, `"${scriptName}"`),
            });
        }
    }
    // Workspace packages → child workspace discovery
    if (pkg.workspaces) {
        const patterns = Array.isArray(pkg.workspaces)
            ? pkg.workspaces
            : pkg.workspaces.packages ?? [];
        for (const pattern of patterns) {
            nodes.push({
                kind: "Workspace",
                name: pattern,
                file_path: filePath,
                line_start: findJsonLine(content, `"${pattern}"`),
                line_end: findJsonLine(content, `"${pattern}"`),
                language: "json",
                parent_name: pkgName,
                is_test: false,
                extra: { glob: pattern },
            });
            edges.push({
                kind: "CONTAINS",
                source: qualify(pkgName, filePath, null),
                target: qualify(pattern, filePath, pkgName),
                file_path: filePath,
                line: findJsonLine(content, `"${pattern}"`),
            });
        }
    }
    return { nodes, edges };
}
// ── Dependency parser ─────────────────────────────────────────────
function parseDeps(deps, depType, pkgName, filePath, nodes, edges) {
    if (!deps)
        return;
    for (const [depName, versionRange] of Object.entries(deps)) {
        // Create a Package node for each dependency
        nodes.push({
            kind: "Package",
            name: depName,
            file_path: filePath,
            line_start: 0,
            line_end: 0,
            language: "json",
            parent_name: pkgName,
            return_type: versionRange,
            is_test: false,
            extra: {
                version: versionRange,
                depType,
                isFramework: isFrameworkDep(depName),
                isInternal: versionRange.startsWith("workspace:"),
            },
        });
        edges.push({
            kind: "DEPENDS_ON",
            source: qualify(pkgName, filePath, null),
            target: `pkg::${depName}`,
            file_path: filePath,
            line: 0,
            extra: {
                version: versionRange,
                depType,
                isInternal: versionRange.startsWith("workspace:"),
            },
        });
    }
}
// ── Framework detection ───────────────────────────────────────────
const FRAMEWORK_DEPS = new Set([
    "next", "react", "react-dom", "vue", "nuxt", "svelte", "@sveltejs/kit",
    "angular", "@angular/core", "astro", "vite", "expo", "expo-router",
    "react-native", "electron",
    "@supabase/supabase-js", "@supabase/ssr", "prisma", "@prisma/client",
    "drizzle-orm", "express", "fastify", "hono", "nestjs",
    "tailwindcss", "@tailwindcss/postcss",
    "@tanstack/react-query", "@tanstack/vue-query",
    "typescript",
    "zod", "vitest", "jest", "playwright", "@playwright/test",
]);
function isFrameworkDep(name) {
    return FRAMEWORK_DEPS.has(name);
}
// ── pnpm-workspace.yaml parser ────────────────────────────────────
function parsePnpmWorkspace(filePath, content) {
    const nodes = [];
    const edges = [];
    const lines = lineCount(content);
    nodes.push({
        kind: "File",
        name: basename(filePath),
        file_path: filePath,
        line_start: 1,
        line_end: lines,
        language: "yaml",
        is_test: false,
    });
    // Extract workspace patterns from YAML (simple regex — avoids yaml parser dep)
    const packagePatterns = [];
    const inPackages = content.includes("packages:");
    if (inPackages) {
        const packageLines = content.match(/^\s+-\s+['"]?([^'"#\n]+)['"]?/gm);
        if (packageLines) {
            for (const line of packageLines) {
                const match = line.match(/^\s+-\s+['"]?([^'"#\n]+)['"]?/);
                if (match) {
                    packagePatterns.push(match[1].trim());
                }
            }
        }
    }
    for (const pattern of packagePatterns) {
        nodes.push({
            kind: "Workspace",
            name: pattern,
            file_path: filePath,
            line_start: findYamlLine(content, pattern),
            line_end: findYamlLine(content, pattern),
            language: "yaml",
            is_test: false,
            extra: { glob: pattern, source: "pnpm-workspace" },
        });
    }
    return { nodes, edges };
}
// ── turbo.json parser ─────────────────────────────────────────────
function parseTurboJson(filePath, content) {
    const nodes = [];
    const edges = [];
    const lines = lineCount(content);
    let turbo;
    try {
        turbo = JSON.parse(content);
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
        extra: { turbo: true },
    });
    // Turbo v2 uses "tasks", v1 uses "pipeline"
    const tasks = turbo.tasks ?? turbo.pipeline ?? {};
    for (const taskName of Object.keys(tasks)) {
        const taskConfig = tasks[taskName];
        nodes.push({
            kind: "Script",
            name: taskName,
            file_path: filePath,
            line_start: findJsonLine(content, `"${taskName}"`),
            line_end: findJsonLine(content, `"${taskName}"`),
            language: "json",
            is_test: false,
            extra: {
                turboTask: true,
                dependsOn: taskConfig?.dependsOn ?? [],
                outputs: taskConfig?.outputs ?? [],
                cache: taskConfig?.cache ?? true,
            },
        });
        // dependsOn creates DEPENDS_ON edges between tasks
        const dependsOn = (taskConfig?.dependsOn ?? []);
        for (const dep of dependsOn) {
            edges.push({
                kind: "DEPENDS_ON",
                source: qualify(taskName, filePath, null),
                target: dep.startsWith("^") ? `turbo::${dep}` : qualify(dep, filePath, null),
                file_path: filePath,
                line: findJsonLine(content, `"${taskName}"`),
                extra: { topological: dep.startsWith("^") },
            });
        }
    }
    return { nodes, edges };
}
// ── Line number helpers ───────────────────────────────────────────
function findJsonLine(content, needle) {
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
function findYamlLine(content, needle) {
    return findJsonLine(content, needle);
}
//# sourceMappingURL=pkg-parser.js.map