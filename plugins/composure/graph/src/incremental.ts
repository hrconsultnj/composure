/**
 * Git-based change detection and incremental graph builds.
 *
 * Provides full builds (parse all files) and incremental updates
 * (parse only changed files + their dependents).
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { CodeParser, fileHash, isParseable } from "./parser.js";
import { detectAndStoreEntities } from "./entities.js";
import { GraphStore } from "./store.js";
import type { BuildResult } from "./types.js";

// ── Default ignore patterns ────────────────────────────────────────

const DEFAULT_IGNORES = new Set([
  "node_modules",
  ".git",
  ".next",
  ".expo",
  "dist",
  "build",
  ".code-review-graph",
  "__pycache__",
  ".turbo",
  ".vercel",
  "coverage",
]);

function shouldIgnore(filePath: string): boolean {
  const parts = filePath.split("/");
  return parts.some((p) => DEFAULT_IGNORES.has(p));
}

// ── Git helpers (using execFileSync for safety) ────────────────────

export function findRepoRoot(start?: string): string | null {
  let dir = start ? resolve(start) : process.cwd();
  while (true) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function findProjectRoot(start?: string): string {
  return findRepoRoot(start) ?? process.cwd();
}

export function getDbPath(repoRoot: string): string {
  return join(repoRoot, ".code-review-graph", "graph.db");
}

/**
 * Run a git command safely using execFileSync (no shell injection).
 * Arguments are passed as an array, not interpolated into a string.
 */
function execGit(args: string[], cwd: string): string {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30000,
    }).trim();
  } catch {
    return "";
  }
}

export function getChangedFiles(repoRoot: string, base = "HEAD~1"): string[] {
  const output = execGit(["diff", "--name-only", base], repoRoot);
  if (!output) return [];
  return output
    .split("\n")
    .filter(Boolean)
    .map((f) => resolve(repoRoot, f));
}

export function getStagedAndUnstaged(repoRoot: string): string[] {
  const output = execGit(["status", "--porcelain"], repoRoot);
  if (!output) return [];
  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
    .map((f) => resolve(repoRoot, f));
}

// ── File collection ────────────────────────────────────────────────

export function collectAllFiles(repoRoot: string): string[] {
  const output = execGit(["ls-files"], repoRoot);
  if (!output) return [];

  const extraIgnores = loadIgnorePatterns(repoRoot);

  return output
    .split("\n")
    .filter(Boolean)
    .map((f) => resolve(repoRoot, f))
    .filter((f) => {
      const rel = relative(repoRoot, f);
      if (shouldIgnore(rel)) return false;
      if (!isParseable(f)) return false;
      if (extraIgnores.some((pattern) => rel.includes(pattern))) return false;
      try {
        return statSync(f).isFile();
      } catch {
        return false;
      }
    });
}

function loadIgnorePatterns(repoRoot: string): string[] {
  const ignorePath = join(repoRoot, ".code-review-graphignore");
  if (!existsSync(ignorePath)) return [];
  try {
    return readFileSync(ignorePath, "utf-8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
  } catch {
    return [];
  }
}

// ── Dependent file discovery ───────────────────────────────────────

export function findDependents(store: GraphStore, filePath: string): string[] {
  const edges = store.getEdgesByTarget(filePath);
  const dependents = new Set<string>();
  for (const e of edges) {
    if (e.kind === "IMPORTS_FROM") {
      dependents.add(e.file_path);
    }
  }
  return [...dependents];
}

// ── Full build ─────────────────────────────────────────────────────

export async function fullBuild(repoRoot: string, store: GraphStore): Promise<BuildResult> {
  const parser = new CodeParser();
  await parser.init();
  const files = collectAllFiles(repoRoot);
  const errors: string[] = [];
  let parsed = 0;

  // Purge stale data for files no longer present
  const existingFiles = new Set(store.getAllFiles());
  const currentFiles = new Set(files);
  for (const f of existingFiles) {
    if (!currentFiles.has(f)) {
      store.removeFileData(f);
    }
  }

  for (const f of files) {
    try {
      const { nodes, edges } = parser.parseFile(f);
      if (nodes.length > 0) {
        const hash = fileHash(f);
        store.storeFileNodesEdges(f, nodes, edges, hash);
        parsed++;
      }
    } catch (err) {
      errors.push(`${f}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Detect domain entities after all files are parsed
  const entityResult = detectAndStoreEntities(store, repoRoot);

  const now = new Date().toISOString();
  store.setMetadata("last_updated", now);
  store.setMetadata("last_build_type", "full");

  const stats = store.getStats();
  return {
    build_type: "full",
    files_parsed: parsed,
    total_nodes: stats.total_nodes,
    total_edges: stats.total_edges,
    errors,
    entities_detected: entityResult.entityCount,
    entity_members: entityResult.memberCount,
  };
}

// ── Incremental update ─────────────────────────────────────────────

export async function incrementalUpdate(
  repoRoot: string,
  store: GraphStore,
  base = "HEAD~1",
  changedFiles?: string[],
): Promise<BuildResult> {
  const parser = new CodeParser();
  await parser.init();
  const errors: string[] = [];

  let changed = changedFiles ?? [
    ...new Set([
      ...getChangedFiles(repoRoot, base),
      ...getStagedAndUnstaged(repoRoot),
    ]),
  ];

  // Filter to parseable source files
  changed = changed.filter(
    (f) => isParseable(f) && !shouldIgnore(relative(repoRoot, f)),
  );

  // Find dependents of changed files
  const dependentFiles = new Set<string>();
  for (const f of changed) {
    for (const dep of findDependents(store, f)) {
      if (!changed.includes(dep)) {
        dependentFiles.add(dep);
      }
    }
  }

  const allToUpdate = [...changed, ...dependentFiles];
  let updated = 0;

  for (const f of allToUpdate) {
    if (!existsSync(f)) {
      store.removeFileData(f);
      continue;
    }

    try {
      const currentHash = fileHash(f);
      const existingNode = store.getNode(f);
      if (existingNode?.file_hash === currentHash) continue;

      const { nodes, edges } = parser.parseFile(f);
      if (nodes.length > 0) {
        store.storeFileNodesEdges(f, nodes, edges, currentHash);
        updated++;
      }
    } catch (err) {
      errors.push(`${f}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Re-detect entities after incremental update
  const entityResult = detectAndStoreEntities(store, repoRoot);

  const now = new Date().toISOString();
  store.setMetadata("last_updated", now);
  store.setMetadata("last_build_type", "incremental");

  const stats = store.getStats();
  return {
    build_type: "incremental",
    files_parsed: updated,
    total_nodes: stats.total_nodes,
    total_edges: stats.total_edges,
    errors,
    changed_files: changed.map((f) => relative(repoRoot, f)),
    dependent_files: [...dependentFiles].map((f) => relative(repoRoot, f)),
    entities_detected: entityResult.entityCount,
    entity_members: entityResult.memberCount,
  };
}

// ── Single file update (for hooks) ─────────────────────────────────

export async function singleFileUpdate(
  repoRoot: string,
  store: GraphStore,
  filePath: string,
): Promise<void> {
  const absPath = resolve(repoRoot, filePath);

  if (!existsSync(absPath)) {
    store.removeFileData(absPath);
    return;
  }

  if (!isParseable(absPath)) return;

  const parser = new CodeParser();
  await parser.init();
  const hash = fileHash(absPath);
  const { nodes, edges } = parser.parseFile(absPath);

  if (nodes.length > 0) {
    store.storeFileNodesEdges(absPath, nodes, edges, hash);
  }

  // Also update dependents
  const dependents = findDependents(store, absPath);
  for (const dep of dependents) {
    if (existsSync(dep) && isParseable(dep)) {
      try {
        const depHash = fileHash(dep);
        const existing = store.getNode(dep);
        if (existing?.file_hash !== depHash) {
          const result = parser.parseFile(dep);
          if (result.nodes.length > 0) {
            store.storeFileNodesEdges(dep, result.nodes, result.edges, depHash);
          }
        }
      } catch {
        // Silently skip errors for dependent files
      }
    }
  }

  store.setMetadata("last_updated", new Date().toISOString());
}
