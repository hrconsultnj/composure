/**
 * Terraform HCL parser for .tf files.
 *
 * Parses Terraform configuration files using regex to extract
 * top-level blocks: resource, data, module, variable, output,
 * locals, and provider. Captures cross-references via var.*,
 * module.*, local.*, and data.* patterns.
 *
 * Node types emitted:
 * - File (the .tf file itself, language: "hcl")
 * - Module (resource, data, and module blocks)
 * - Type (variable and output blocks)
 *
 * Edge types:
 * - CONTAINS (File → block node)
 * - REFERENCES (block → var.X, module.X, local.X, data.X.Y)
 * - IMPORTS_FROM (module → source path for local modules)
 */

import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import type { EdgeInfo, NodeInfo } from "./types.js";

// ── Detection ─────────────────────────────────────────────────────

export function isHclParseable(filePath: string): boolean {
  return extname(filePath).toLowerCase() === ".tf";
}

// ── Helpers ───────────────────────────────────────────────────────

function qualify(name: string, filePath: string, parent: string | null): string {
  return parent ? `${filePath}::${parent}.${name}` : `${filePath}::${name}`;
}

function lineCount(content: string): number {
  return content.split("\n").length;
}

// ── Block detection ───────────────────────────────────────────────

/**
 * Match top-level HCL blocks:
 *   resource "aws_instance" "web" {
 *   data "aws_ami" "latest" {
 *   module "networking" {
 *   variable "environment" {
 *   output "cluster_endpoint" {
 *   provider "aws" {
 *   locals {
 *
 * Captures: blockType, firstLabel, secondLabel (optional)
 */
const BLOCK_RE = /^(resource|data|module|variable|output|provider)\s+"([^"]+)"(?:\s+"([^"]+)")?\s*\{/gm;
const LOCALS_RE = /^(locals)\s*\{/gm;

/** Cross-references within block bodies. */
const VAR_REF_RE = /var\.(\w+)/g;
const MODULE_REF_RE = /module\.(\w+)/g;
const LOCAL_REF_RE = /local\.(\w+)/g;
const DATA_REF_RE = /data\.(\w+)\.(\w+)/g;
const RESOURCE_REF_RE = /(\w+)\.(\w+)\.(\w+)/g; // e.g., aws_instance.web.id

/** Module source for local module imports. */
const SOURCE_RE = /source\s*=\s*"([^"]+)"/;

// ── Main parser ──────────────────────────────────────────────────

export function parseHclFile(filePath: string): { nodes: NodeInfo[]; edges: EdgeInfo[] } {
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
    language: "hcl",
    is_test: false,
  });

  // Parse top-level blocks
  const blocks = extractBlocks(content, lines);

  for (const block of blocks) {
    const nodeKind = getNodeKind(block.blockType);
    const nodeName = getBlockName(block);
    const nodeQN = qualify(nodeName, filePath, fileName);

    nodes.push({
      kind: nodeKind,
      name: nodeName,
      file_path: filePath,
      line_start: block.lineStart,
      line_end: block.lineEnd,
      language: "hcl",
      parent_name: fileName,
      summary: `Terraform ${block.blockType}: ${block.firstLabel || ""}`,
      is_test: false,
      extra: {
        blockType: block.blockType,
        resourceType: block.firstLabel,
        resourceName: block.secondLabel,
      },
    });

    // CONTAINS edge
    edges.push({
      kind: "CONTAINS",
      source: fileQN,
      target: nodeQN,
      file_path: filePath,
      line: block.lineStart,
    });

    // Extract references from block body
    const bodyRefs = extractBlockReferences(block.body, filePath, block.lineStart);
    for (const ref of bodyRefs) {
      edges.push({
        kind: "REFERENCES",
        source: nodeQN,
        target: qualify(ref.target, filePath, fileName),
        file_path: filePath,
        line: ref.line,
        extra: { refType: ref.type },
      });
    }

    // Module source → IMPORTS_FROM edge (for local modules)
    if (block.blockType === "module") {
      const sourceMatch = SOURCE_RE.exec(block.body);
      if (sourceMatch && sourceMatch[1].startsWith("./")) {
        edges.push({
          kind: "IMPORTS_FROM",
          source: nodeQN,
          target: sourceMatch[1],
          file_path: filePath,
          line: block.lineStart,
          extra: { moduleSource: sourceMatch[1] },
        });
      }
    }
  }

  return { nodes, edges };
}

// ── Block extraction ──────────────────────────────────────────────

interface HclBlock {
  blockType: string;
  firstLabel: string | null;
  secondLabel: string | null;
  lineStart: number;
  lineEnd: number;
  body: string;
}

function extractBlocks(content: string, lines: string[]): HclBlock[] {
  const blocks: HclBlock[] = [];

  // Match labeled blocks: resource "type" "name" {
  BLOCK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BLOCK_RE.exec(content)) !== null) {
    const lineStart = content.substring(0, m.index).split("\n").length;
    const blockEnd = findBlockEnd(lines, lineStart - 1);
    const body = lines.slice(lineStart - 1, blockEnd).join("\n");

    blocks.push({
      blockType: m[1],
      firstLabel: m[2],
      secondLabel: m[3] || null,
      lineStart,
      lineEnd: blockEnd,
      body,
    });
  }

  // Match locals { ... } (no labels)
  LOCALS_RE.lastIndex = 0;
  while ((m = LOCALS_RE.exec(content)) !== null) {
    const lineStart = content.substring(0, m.index).split("\n").length;
    const blockEnd = findBlockEnd(lines, lineStart - 1);
    const body = lines.slice(lineStart - 1, blockEnd).join("\n");

    blocks.push({
      blockType: "locals",
      firstLabel: null,
      secondLabel: null,
      lineStart,
      lineEnd: blockEnd,
      body,
    });
  }

  return blocks;
}

/** Find the closing brace for a block starting at lineIdx. */
function findBlockEnd(lines: string[], lineIdx: number): number {
  let depth = 0;
  for (let i = lineIdx; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
    }
    if (depth === 0 && i > lineIdx) return i + 1;
  }
  return lines.length;
}

function getNodeKind(blockType: string): "Module" | "Type" {
  // resource, data, module → Module kind
  // variable, output → Type kind
  // locals, provider → Type kind
  if (blockType === "resource" || blockType === "data" || blockType === "module") {
    return "Module";
  }
  return "Type";
}

function getBlockName(block: HclBlock): string {
  switch (block.blockType) {
    case "resource":
      return `${block.firstLabel}.${block.secondLabel}`;
    case "data":
      return `data.${block.firstLabel}.${block.secondLabel}`;
    case "module":
      return `module.${block.firstLabel}`;
    case "variable":
      return `var.${block.firstLabel}`;
    case "output":
      return `output.${block.firstLabel}`;
    case "provider":
      return `provider.${block.firstLabel}`;
    case "locals":
      return "locals";
    default:
      return block.firstLabel || block.blockType;
  }
}

// ── Reference extraction ──────────────────────────────────────────

interface BlockRef {
  type: string;
  target: string;
  line: number;
}

function extractBlockReferences(body: string, _filePath: string, blockStart: number): BlockRef[] {
  const refs: BlockRef[] = [];
  const seen = new Set<string>();
  const bodyLines = body.split("\n");

  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i];
    const lineNum = blockStart + i;

    // var.X references
    VAR_REF_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = VAR_REF_RE.exec(line)) !== null) {
      const key = `var.${m[1]}`;
      if (!seen.has(key)) {
        seen.add(key);
        refs.push({ type: "variable", target: key, line: lineNum });
      }
    }

    // module.X references
    MODULE_REF_RE.lastIndex = 0;
    while ((m = MODULE_REF_RE.exec(line)) !== null) {
      const key = `module.${m[1]}`;
      if (!seen.has(key)) {
        seen.add(key);
        refs.push({ type: "module", target: key, line: lineNum });
      }
    }

    // local.X references
    LOCAL_REF_RE.lastIndex = 0;
    while ((m = LOCAL_REF_RE.exec(line)) !== null) {
      const key = `local.${m[1]}`;
      if (!seen.has(key)) {
        seen.add(key);
        refs.push({ type: "local", target: key, line: lineNum });
      }
    }

    // data.X.Y references
    DATA_REF_RE.lastIndex = 0;
    while ((m = DATA_REF_RE.exec(line)) !== null) {
      const key = `data.${m[1]}.${m[2]}`;
      if (!seen.has(key)) {
        seen.add(key);
        refs.push({ type: "data", target: key, line: lineNum });
      }
    }
  }

  return refs;
}
