#!/usr/bin/env node
/**
 * CLI entry point for hook-triggered incremental graph updates.
 *
 * Usage: node dist/update.js --file <path>
 *
 * Designed to be called by the PostToolUse hook on Edit/Write events.
 * Exits 0 always (non-blocking for hooks).
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { isParseable } from "./parser.js";
import { GraphStore } from "./store.js";
import { findProjectRoot, getDbPath, singleFileUpdate } from "./incremental.js";
async function main() {
    const args = process.argv.slice(2);
    // Parse --file argument
    let filePath = null;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--file" && i + 1 < args.length) {
            filePath = args[i + 1];
            break;
        }
    }
    if (!filePath) {
        // No file specified — nothing to do
        process.exit(0);
    }
    // Resolve to absolute path
    filePath = resolve(filePath);
    // Skip non-parseable files
    if (!isParseable(filePath)) {
        process.exit(0);
    }
    // Skip if file doesn't exist (deleted)
    if (!existsSync(filePath)) {
        process.exit(0);
    }
    const root = findProjectRoot();
    const dbPath = getDbPath(root);
    // Skip if graph hasn't been built yet
    if (!existsSync(dbPath)) {
        process.exit(0);
    }
    let store;
    try {
        store = new GraphStore(dbPath);
    }
    catch {
        process.exit(0);
    }
    try {
        await singleFileUpdate(root, store, filePath);
    }
    catch (err) {
        // Log to stderr but don't fail the hook
        console.error("composure-graph update error:", err);
    }
    finally {
        store.close();
    }
}
main();
//# sourceMappingURL=update.js.map