import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { GraphStore, edgeToDict, nodeToDict } from "../store.js";
import {
  findProjectRoot,
  getChangedFiles,
  getDbPath,
  getStagedAndUnstaged,
} from "../incremental.js";
import { getImpactRadius } from "../bfs.js";
import type { ToolResult } from "../types.js";

export function getReviewContext(params: {
  changed_files?: string[];
  max_depth?: number;
  include_source?: boolean;
  max_lines_per_file?: number;
  repo_root?: string;
  base?: string;
}): ToolResult {
  const root = findProjectRoot(params.repo_root);
  const dbPath = getDbPath(root);
  const base = params.base ?? "HEAD~1";
  const includeSource = params.include_source ?? true;
  const maxLines = params.max_lines_per_file ?? 200;

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
    // Auto-detect changed files
    let changedFiles = params.changed_files?.map((f) => resolve(root, f));
    if (!changedFiles || changedFiles.length === 0) {
      changedFiles = [
        ...new Set([
          ...getChangedFiles(root, base),
          ...getStagedAndUnstaged(root),
        ]),
      ];
    }

    if (changedFiles.length === 0) {
      return {
        status: "ok",
        summary: "No changed files detected.",
        context: {
          changed_files: [],
          impacted_files: [],
          graph: { changed_nodes: [], impacted_nodes: [], edges: [] },
          source_snippets: {},
          review_guidance: {},
        },
      };
    }

    // Get impact radius
    const impact = getImpactRadius(store, changedFiles, params.max_depth ?? 2);

    // Extract source snippets for changed files
    const sourceSnippets: Record<string, string> = {};
    if (includeSource) {
      for (const f of changedFiles) {
        try {
          const content = readFileSync(f, "utf-8");
          const lines = content.split("\n");
          const snippet =
            lines.length > maxLines
              ? lines.slice(0, maxLines).join("\n") + `\n... (${lines.length - maxLines} more lines)`
              : content;
          sourceSnippets[relative(root, f)] = snippet;
        } catch {
          // File may not exist
        }
      }
    }

    // Generate review guidance
    const guidance: Record<string, string[]> = {};

    // Flag widely-impacted changes
    const wideImpact = impact.impacted_files.length > 5;
    if (wideImpact) {
      guidance["wide_impact"] = [
        `This change impacts ${impact.impacted_files.length} files — review carefully for breaking changes.`,
      ];
    }

    // Flag untested functions
    const untestedFunctions: string[] = [];
    for (const n of impact.changed_nodes) {
      if (n.kind === "Function" && !n.is_test) {
        const testedBy = store.getEdgesBySource(n.qualified_name);
        const hasTest = testedBy.some((e) => e.kind === "TESTED_BY");
        if (!hasTest) {
          untestedFunctions.push(n.name);
        }
      }
    }
    if (untestedFunctions.length > 0) {
      guidance["test_coverage"] = [
        `${untestedFunctions.length} changed functions have no test coverage: ${untestedFunctions.join(", ")}`,
      ];
    }

    const summary = [
      `${changedFiles.length} changed files`,
      `${impact.impacted_files.length} impacted files`,
      `${impact.changed_nodes.length} changed nodes`,
      untestedFunctions.length > 0
        ? `${untestedFunctions.length} untested functions`
        : null,
    ]
      .filter(Boolean)
      .join(", ");

    return {
      status: "ok",
      summary,
      context: {
        changed_files: changedFiles.map((f) => relative(root, f)),
        impacted_files: impact.impacted_files.map((f) => relative(root, f)),
        graph: {
          changed_nodes: impact.changed_nodes.map(nodeToDict),
          impacted_nodes: impact.impacted_nodes.map(nodeToDict),
          edges: impact.edges.map(edgeToDict),
        },
        source_snippets: sourceSnippets,
        review_guidance: guidance,
      },
    };
  } finally {
    store.close();
  }
}
