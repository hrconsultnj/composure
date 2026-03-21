import { GraphStore } from "../store.js";
import {
  findProjectRoot,
  fullBuild,
  getDbPath,
  incrementalUpdate,
} from "../incremental.js";
import type { ToolResult } from "../types.js";

export async function buildOrUpdateGraph(params: {
  full_rebuild?: boolean;
  repo_root?: string;
  base?: string;
}): Promise<ToolResult> {
  const root = findProjectRoot(params.repo_root);
  const dbPath = getDbPath(root);

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
    const result = params.full_rebuild
      ? await fullBuild(root, store)
      : await incrementalUpdate(root, store, params.base ?? "HEAD~1");

    const verb = result.build_type === "full" ? "Built" : "Updated";
    const summary = [
      `${verb} graph: ${result.files_parsed} files parsed`,
      `${result.total_nodes} nodes, ${result.total_edges} edges`,
      result.errors.length > 0
        ? `${result.errors.length} errors`
        : "no errors",
    ].join(". ");

    return {
      status: "ok",
      summary,
      build_type: result.build_type,
      files_parsed: result.files_parsed,
      total_nodes: result.total_nodes,
      total_edges: result.total_edges,
      errors: result.errors,
      changed_files: result.changed_files,
      dependent_files: result.dependent_files,
    };
  } finally {
    store.close();
  }
}
