/**
 * Dockerfile parser for multi-stage build analysis.
 *
 * Parses Dockerfiles using regex to extract build stages, base images,
 * COPY --from references, and exposed ports.
 *
 * Node types emitted:
 * - File (the Dockerfile itself, language: "dockerfile")
 * - Stage (each FROM instruction, named by alias or base image)
 *
 * Edge types:
 * - CONTAINS (File → Stage)
 * - REFERENCES (Stage → previous stage via COPY --from=)
 * - REFERENCES (Stage → base image)
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type { EdgeInfo, NodeInfo } from "./types.js";

// ── Detection ─────────────────────────────────────────────────────

const DOCKERFILE_NAMES = new Set([
  "Dockerfile",
  "Dockerfile.dev",
  "Dockerfile.prod",
  "Dockerfile.test",
  "Dockerfile.ci",
]);

export function isDockerfileParseable(filePath: string): boolean {
  const name = basename(filePath);
  if (DOCKERFILE_NAMES.has(name)) return true;
  if (name.startsWith("Dockerfile.")) return true;
  // Also match "dockerfile" (lowercase, common in some projects)
  if (name.toLowerCase() === "dockerfile") return true;
  return false;
}

// ── Helpers ───────────────────────────────────────────────────────

function qualify(name: string, filePath: string, parent: string | null): string {
  return parent ? `${filePath}::${parent}.${name}` : `${filePath}::${name}`;
}

function lineCount(content: string): number {
  return content.split("\n").length;
}

// ── Instruction patterns ──────────────────────────────────────────

const FROM_RE = /^FROM\s+(\S+)(?:\s+AS\s+(\S+))?/gim;
const COPY_FROM_RE = /^COPY\s+--from=(\S+)/gim;
const EXPOSE_RE = /^EXPOSE\s+(.+)/gim;
const ARG_RE = /^ARG\s+(\w+)(?:=(\S+))?/gim;

// ── Main parser ──────────────────────────────────────────────────

export function parseDockerfile(filePath: string): { nodes: NodeInfo[]; edges: EdgeInfo[] } {
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return { nodes: [], edges: [] };
  }

  const nodes: NodeInfo[] = [];
  const edges: EdgeInfo[] = [];
  const fileName = basename(filePath);
  const totalLines = lineCount(content);
  const lines = content.split("\n");

  // File node
  const fileQN = filePath;
  nodes.push({
    kind: "File",
    name: fileName,
    file_path: filePath,
    line_start: 1,
    line_end: totalLines,
    language: "dockerfile",
    is_test: false,
  });

  // Extract stages (FROM instructions)
  const stages = extractStages(content, lines);
  const stageNames = new Set(stages.map((s) => s.alias).filter(Boolean));

  for (const stage of stages) {
    const stageName = stage.alias || stage.baseImage;
    const stageQN = qualify(stageName, filePath, fileName);

    nodes.push({
      kind: "Stage",
      name: stageName,
      file_path: filePath,
      line_start: stage.lineStart,
      line_end: stage.lineEnd,
      language: "dockerfile",
      parent_name: fileName,
      summary: `FROM ${stage.baseImage}`,
      is_test: false,
      extra: {
        baseImage: stage.baseImage,
        alias: stage.alias,
        exposedPorts: stage.exposedPorts,
      },
    });

    // CONTAINS edge: File → Stage
    edges.push({
      kind: "CONTAINS",
      source: fileQN,
      target: stageQN,
      file_path: filePath,
      line: stage.lineStart,
    });

    // REFERENCES edge: Stage → base image (if it's another stage)
    if (stageNames.has(stage.baseImage)) {
      edges.push({
        kind: "REFERENCES",
        source: stageQN,
        target: qualify(stage.baseImage, filePath, fileName),
        file_path: filePath,
        line: stage.lineStart,
        extra: { refType: "FROM" },
      });
    }

    // REFERENCES edges: COPY --from= references
    for (const copyFrom of stage.copyFromRefs) {
      const targetName = stageNames.has(copyFrom.name) ? copyFrom.name : copyFrom.name;
      edges.push({
        kind: "REFERENCES",
        source: stageQN,
        target: qualify(targetName, filePath, fileName),
        file_path: filePath,
        line: copyFrom.line,
        extra: { refType: "COPY --from" },
      });
    }
  }

  return { nodes, edges };
}

// ── Stage extraction ──────────────────────────────────────────────

interface DockerStage {
  baseImage: string;
  alias: string | null;
  lineStart: number;
  lineEnd: number;
  exposedPorts: string[];
  copyFromRefs: Array<{ name: string; line: number }>;
}

function extractStages(content: string, lines: string[]): DockerStage[] {
  const stages: DockerStage[] = [];

  // Find all FROM instructions with their line numbers
  const fromPositions: Array<{ baseImage: string; alias: string | null; lineNum: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = /^FROM\s+(\S+)(?:\s+AS\s+(\S+))?$/i.exec(line);
    if (match) {
      fromPositions.push({
        baseImage: match[1],
        alias: match[2] || null,
        lineNum: i + 1,
      });
    }
  }

  // Each stage runs from its FROM to the next FROM (or end of file)
  for (let i = 0; i < fromPositions.length; i++) {
    const start = fromPositions[i].lineNum;
    const end = i + 1 < fromPositions.length
      ? fromPositions[i + 1].lineNum - 1
      : lines.length;

    const stageLines = lines.slice(start - 1, end);
    const exposedPorts: string[] = [];
    const copyFromRefs: Array<{ name: string; line: number }> = [];

    for (let j = 0; j < stageLines.length; j++) {
      const sl = stageLines[j].trim();

      // EXPOSE
      const exposeMatch = /^EXPOSE\s+(.+)/i.exec(sl);
      if (exposeMatch) {
        exposedPorts.push(...exposeMatch[1].trim().split(/\s+/));
      }

      // COPY --from=
      const copyMatch = /^COPY\s+--from=(\S+)/i.exec(sl);
      if (copyMatch) {
        copyFromRefs.push({ name: copyMatch[1], line: start + j });
      }
    }

    stages.push({
      baseImage: fromPositions[i].baseImage,
      alias: fromPositions[i].alias,
      lineStart: start,
      lineEnd: end,
      exposedPorts,
      copyFromRefs,
    });
  }

  return stages;
}
