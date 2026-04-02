#!/usr/bin/env node
/**
 * CLI entry point for generating the HTML graph visualization.
 *
 * Usage:
 *   node dist/view-graph.js [--output <path>] [--repo-root <path>]
 *
 * Generates a self-contained .html file from the code review graph.
 * Default output: .code-review-graph/graph.html
 */
import { existsSync } from "node:fs";
import { findProjectRoot, getDbPath } from "./incremental.js";
import { generateGraphHtmlTool } from "./tools/generate-graph-html.js";
function main() {
    const args = process.argv.slice(2);
    let outputPath;
    let repoRoot;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--output" && i + 1 < args.length) {
            outputPath = args[i + 1];
            i++;
        }
        else if (args[i] === "--repo-root" && i + 1 < args.length) {
            repoRoot = args[i + 1];
            i++;
        }
    }
    // Check if graph DB exists
    const root = findProjectRoot(repoRoot);
    const dbPath = getDbPath(root);
    if (!existsSync(dbPath)) {
        console.error("Graph database not found. Run /build-graph first.");
        process.exit(1);
    }
    const result = generateGraphHtmlTool({
        output_path: outputPath,
        repo_root: repoRoot,
    });
    if (result.status === "ok") {
        console.log(result.summary);
        console.log(`Output: ${result.output_path}`);
    }
    else {
        console.error(`Error: ${result.error}`);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=view-graph.js.map