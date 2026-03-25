import { GraphStore, nodeToDict } from "../store.js";
import { findProjectRoot, getDbPath } from "../incremental.js";
import type { ToolResult } from "../types.js";

export function findLargeFunctions(params: {
  min_lines?: number;
  file_pattern?: string;
  kind?: string;
  repo_root?: string;
}): ToolResult {
  const root = findProjectRoot(params.repo_root);
  const dbPath = getDbPath(root);
  const minLines = params.min_lines ?? 150;

  let store: GraphStore;
  try {
    store = new GraphStore(dbPath);
  } catch (err) {
    return {
      status: "error",
      error: `Cannot open graph database: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  try {
    const nodes = store.getNodesBySize(
      minLines,
      undefined,
      params.kind,
      params.file_pattern,
    );

    const results = nodes.map((n) => nodeToDict(n));
    const summary = `Found ${results.length} nodes with ${minLines}+ lines`;

    return {
      status: "ok",
      summary,
      min_lines: minLines,
      results,
    };
  } finally {
    store.close();
  }
}
