/**
 * search_references — grep + graph context enrichment.
 *
 * Searches for a string pattern across the repo (via ripgrep or fallback),
 * then enriches each match with graph context: containing node, entity
 * membership, importer count, and file role classification.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import { GraphStore } from "../store.js";
import { findProjectRoot, getDbPath } from "../incremental.js";
function classifyFileRole(filePath) {
    if (/\/skills\//.test(filePath))
        return "skill";
    if (/\/hooks\//.test(filePath))
        return "hook";
    if (/\/components\//.test(filePath))
        return "component";
    if (/\/(app|pages)\/.*\/(page|layout|route)\.\w+$/.test(filePath))
        return "route";
    if (/\.(test|spec)\./.test(filePath))
        return "test";
    if (/\/lib\//.test(filePath))
        return "lib";
    if (/\.(config|rc)\.\w+$/.test(filePath))
        return "config";
    if (/\/defaults\//.test(filePath))
        return "defaults";
    if (/\/templates\//.test(filePath))
        return "template";
    if (/\/steps\//.test(filePath))
        return "skill-step";
    if (/\/references\//.test(filePath))
        return "reference";
    return "source";
}
/** Convert a simple glob pattern to a regex for path filtering. */
function globToRegex(glob) {
    const escaped = glob
        .replace(/\./g, "\\.") // escape dots
        .replace(/\*\*\//g, "(.*/)?") // **/ → optional path prefix
        .replace(/\*/g, "[^/]*"); // * → non-slash chars
    return new RegExp(escaped + "$");
}
/** Find ripgrep binary. Returns absolute path or null. */
function findRg() {
    const candidates = [
        "/usr/local/bin/rg",
        "/opt/homebrew/bin/rg",
        `${process.env.HOME}/.cargo/bin/rg`,
    ];
    for (const p of candidates) {
        if (existsSync(p))
            return p;
    }
    // Check if rg is in PATH by trying a no-op
    try {
        execFileSync("rg", ["--version"], { encoding: "utf-8", stdio: "pipe" });
        return "rg";
    }
    catch {
        return null;
    }
}
function searchWithRipgrep(root, pattern, scope, contextLines, maxResults) {
    const rgPath = findRg();
    if (rgPath) {
        return searchWithRg(rgPath, root, pattern, scope, contextLines, maxResults);
    }
    return searchWithGrep(root, pattern, scope, contextLines, maxResults);
}
function searchWithRg(rgPath, root, pattern, scope, contextLines, maxResults) {
    const args = [
        "--no-heading", "-n",
        ...(contextLines > 0 ? [`-C${contextLines}`] : []),
        "--max-count", String(maxResults),
        "--glob", "!node_modules",
        "--glob", "!.git",
        "--glob", "!dist",
        "--glob", "!*.map",
        ...(scope ? ["--glob", scope] : []),
        pattern,
        root,
    ];
    try {
        const output = execFileSync(rgPath, args, {
            encoding: "utf-8",
            maxBuffer: 1024 * 1024,
            stdio: ["pipe", "pipe", "pipe"],
        });
        return parseRipgrepOutput(output, root, contextLines);
    }
    catch (err) {
        // rg exits with code 1 when no matches — that's fine
        const e = err;
        if (e.status === 1)
            return [];
        // rg exits with code 2 for errors — check if there's partial output
        if (e.stdout)
            return parseRipgrepOutput(e.stdout, root, contextLines);
        return [];
    }
}
function searchWithGrep(root, pattern, scope, contextLines, maxResults) {
    const args = [
        "-rn",
        ...(contextLines > 0 ? [`-C${contextLines}`] : []),
        "--include=*.ts", "--include=*.tsx", "--include=*.js", "--include=*.jsx",
        "--include=*.md", "--include=*.sh", "--include=*.json",
        "--exclude-dir=node_modules", "--exclude-dir=.git", "--exclude-dir=dist",
        `-m${maxResults}`,
        pattern,
        root,
    ];
    try {
        const output = execFileSync("grep", args, {
            encoding: "utf-8",
            maxBuffer: 1024 * 1024,
            stdio: ["pipe", "pipe", "pipe"],
        });
        let matches = parseRipgrepOutput(output, root, contextLines);
        // Post-filter by scope glob if provided (grep can't handle path globs)
        if (scope) {
            const re = globToRegex(scope);
            matches = matches.filter((m) => re.test(m.file));
        }
        return matches;
    }
    catch {
        return [];
    }
}
function parseRipgrepOutput(output, root, contextLines) {
    const matches = [];
    const lines = output.split("\n").filter(Boolean);
    if (contextLines === 0) {
        for (const line of lines) {
            const m = line.match(/^(.+?):(\d+):(.*)$/);
            if (m) {
                matches.push({
                    file: relative(root, m[1]),
                    line: parseInt(m[2], 10),
                    text: m[3],
                });
            }
        }
    }
    else {
        // With context, rg uses -- as separator between groups
        let currentMatch = null;
        const beforeLines = [];
        for (const line of lines) {
            if (line === "--") {
                if (currentMatch)
                    matches.push(currentMatch);
                currentMatch = null;
                beforeLines.length = 0;
                continue;
            }
            // Match line (colon-separated) vs context line (dash-separated)
            const matchLine = line.match(/^(.+?):(\d+):(.*)$/);
            const ctxLine = line.match(/^(.+?)-(\d+)-(.*)$/);
            if (matchLine) {
                currentMatch = {
                    file: relative(root, matchLine[1]),
                    line: parseInt(matchLine[2], 10),
                    text: matchLine[3],
                    context_before: beforeLines.length > 0 ? beforeLines.join("\n") : undefined,
                };
                beforeLines.length = 0;
            }
            else if (ctxLine) {
                if (currentMatch) {
                    currentMatch.context_after = (currentMatch.context_after ?? "") +
                        (currentMatch.context_after ? "\n" : "") + ctxLine[3];
                }
                else {
                    beforeLines.push(ctxLine[3]);
                }
            }
        }
        if (currentMatch)
            matches.push(currentMatch);
    }
    return matches;
}
export function searchReferences(params) {
    const root = findProjectRoot(params.repo_root);
    const dbPath = getDbPath(root);
    const contextLines = params.context_lines ?? 1;
    const maxResults = params.max_results ?? 50;
    // Step 1: Search with ripgrep
    const matches = searchWithRipgrep(root, params.pattern, params.scope, contextLines, maxResults);
    if (matches.length === 0) {
        return {
            status: "ok",
            summary: `No matches for "${params.pattern}"`,
            pattern: params.pattern,
            results: [],
        };
    }
    // Step 2: Enrich with graph context
    let store = null;
    try {
        store = new GraphStore(dbPath);
    }
    catch {
        // Graph not available — return matches without enrichment
    }
    const results = matches.map((m) => {
        const absPath = resolve(root, m.file);
        let containingNode = null;
        let entity = null;
        let importersCount = 0;
        if (store) {
            // Find containing node (the node whose line range includes this match)
            const fileNodes = store.getNodesByFile(absPath);
            for (const node of fileNodes) {
                if (node.kind === "File")
                    continue;
                if (node.line_start <= m.line && node.line_end >= m.line) {
                    containingNode = node.name;
                    break;
                }
            }
            // Count importers of this file
            const fileNode = fileNodes.find((n) => n.kind === "File");
            if (fileNode) {
                try {
                    const rows = store.getDb()
                        .prepare("SELECT COUNT(*) as cnt FROM edges WHERE target_qualified = ? AND kind = 'IMPORTS_FROM'")
                        .all(fileNode.qualified_name);
                    importersCount = rows[0]?.cnt ?? 0;
                }
                catch { /* ignore */ }
            }
            // Try to get entity membership
            try {
                const entityRows = store.getDb()
                    .prepare("SELECT entity_name FROM entity_members WHERE node_qualified_name = ? LIMIT 1")
                    .all(fileNode?.qualified_name ?? "");
                entity = entityRows[0]?.entity_name ?? null;
            }
            catch { /* entity table may not exist */ }
        }
        return {
            file: m.file,
            line: m.line,
            text: m.text,
            ...(m.context_before ? { context_before: m.context_before } : {}),
            ...(m.context_after ? { context_after: m.context_after } : {}),
            containing_node: containingNode,
            entity,
            importers_count: importersCount,
            role: classifyFileRole(m.file),
        };
    });
    if (store)
        store.close();
    return {
        status: "ok",
        summary: `Found ${results.length} matches for "${params.pattern}"`,
        pattern: params.pattern,
        results,
    };
}
//# sourceMappingURL=search-references.js.map