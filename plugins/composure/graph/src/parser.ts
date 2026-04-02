/**
 * Tree-sitter parser for TypeScript, TSX, JavaScript, and JSX.
 *
 * The CodeParser class orchestrates parsing: reads files, runs tree-sitter,
 * walks the AST to extract structural nodes/edges, and resolves call targets.
 * Helper functions for AST extraction live in parser-helpers.ts.
 * Node handler functions live in parser-handlers.ts.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EdgeInfo, NodeInfo } from "./types.js";

import { Parser, Language, type Node } from "web-tree-sitter";

import {
  CLASS_TYPES,
  FUNCTION_TYPES,
  IMPORT_TYPES,
  CALL_TYPES,
  TYPE_TYPES,
  isTestFile,
  qualify,
  getNodeText,
  getName,
  getArrowFunctionName,
  collectJsImportNames,
  extractImportTarget,
  resolveModuleToFile,
} from "./parser-helpers.js";

import {
  handleClass,
  handleType,
  handleFunction,
  handleLexicalDeclaration,
  handleImport,
  handleCall,
  resolveCallTargets,
  generateTestEdges,
} from "./parser-handlers.js";

// ── Language detection ─────────────────────────────────────────────

const EXT_TO_LANG: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".jsx": "jsx",
};

const PARSEABLE_EXTENSIONS = new Set(Object.keys(EXT_TO_LANG));

/** Extensions handled by the SQL parser (not tree-sitter). */
const SQL_EXTENSIONS = new Set([".sql", ".prisma"]);

/** Files handled by the package.json parser (by filename, not extension). */
const PKG_FILENAMES = new Set(["package.json", "pnpm-workspace.yaml", "turbo.json"]);

const CONFIG_FILENAMES_QUICK = new Set([
  "tsconfig.json", "tsconfig.base.json", "tsconfig.app.json",
  ".env.example", ".env.local.example", ".env.template",
  "vercel.json",
]);
const CONFIG_PREFIXES = ["next.config", "tailwind.config"];

function isConfigFile(filePath: string): boolean {
  const name = basename(filePath);
  if (CONFIG_FILENAMES_QUICK.has(name)) return true;
  for (const prefix of CONFIG_PREFIXES) {
    if (name.startsWith(prefix)) return true;
  }
  if (/^\.env\.(example|template|local\.example|sample)$/.test(name)) return true;
  return false;
}

const MD_EXTENSIONS = new Set([".md", ".mdx"]);
const SH_EXTENSIONS = new Set([".sh"]);
const YAML_EXTENSIONS = new Set([".yaml", ".yml"]);
const TF_EXTENSIONS = new Set([".tf"]);

function isDockerfileName(filePath: string): boolean {
  const name = basename(filePath);
  return name === "Dockerfile" || name.startsWith("Dockerfile.") || name.toLowerCase() === "dockerfile";
}

export function isParseable(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  if (PARSEABLE_EXTENSIONS.has(ext) || SQL_EXTENSIONS.has(ext)) return true;
  if (SH_EXTENSIONS.has(ext)) return true;
  if (PKG_FILENAMES.has(basename(filePath))) return true;
  if (isConfigFile(filePath)) return true;
  if (MD_EXTENSIONS.has(ext)) return true;
  if (basename(filePath) === "hooks.json" && filePath.includes("/hooks/")) return true;
  if (YAML_EXTENSIONS.has(ext)) return true;
  if (TF_EXTENSIONS.has(ext)) return true;
  if (isDockerfileName(filePath)) return true;
  return false;
}

export function isTreeSitterParseable(filePath: string): boolean {
  return PARSEABLE_EXTENSIONS.has(extname(filePath).toLowerCase());
}

function detectLanguage(filePath: string): string | null {
  return EXT_TO_LANG[extname(filePath).toLowerCase()] ?? null;
}

// ── File hash ──────────────────────────────────────────────────────

export function fileHash(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

// ── CodeParser ─────────────────────────────────────────────────────

const __dirname = typeof import.meta.url !== "undefined"
  ? fileURLToPath(new URL(".", import.meta.url))
  : process.cwd();

const WASM_PATHS: Record<string, string> = {
  typescript: join(__dirname, "tree-sitter-typescript.wasm"),
  tsx: join(__dirname, "tree-sitter-tsx.wasm"),
  javascript: join(__dirname, "tree-sitter-javascript.wasm"),
  jsx: join(__dirname, "tree-sitter-javascript.wasm"),
};

let parserInitialized = false;

export class CodeParser {
  private languages = new Map<string, Language>();
  private moduleCache = new Map<string, string | null>();

  async init(): Promise<void> {
    if (!parserInitialized) {
      await Parser.init();
      parserInitialized = true;
    }

    for (const [lang, wasmPath] of Object.entries(WASM_PATHS)) {
      if (!this.languages.has(lang)) {
        try {
          const language = await Language.load(wasmPath);
          this.languages.set(lang, language);
        } catch {
          // WASM file not found — skip this language
        }
      }
    }
  }

  private getParser(language: string): Parser | null {
    const lang = this.languages.get(language);
    if (!lang) return null;

    const parser = new Parser();
    parser.setLanguage(lang);
    return parser;
  }

  parseFile(filePath: string): { nodes: NodeInfo[]; edges: EdgeInfo[] } {
    let source: Buffer;
    try {
      source = readFileSync(filePath);
    } catch {
      return { nodes: [], edges: [] };
    }
    return this.parseBytes(filePath, source);
  }

  parseBytes(
    filePath: string,
    source: Buffer,
  ): { nodes: NodeInfo[]; edges: EdgeInfo[] } {
    const language = detectLanguage(filePath);
    if (!language) return { nodes: [], edges: [] };

    const parser = this.getParser(language);
    if (!parser) return { nodes: [], edges: [] };

    const tree = parser.parse(source.toString());
    if (!tree) return { nodes: [], edges: [] };
    const nodes: NodeInfo[] = [];
    const edges: EdgeInfo[] = [];
    const testFile = isTestFile(filePath);

    const lineCount = source.toString().split("\n").length;
    nodes.push({
      kind: "File",
      name: basename(filePath),
      file_path: filePath,
      line_start: 1,
      line_end: lineCount,
      language,
      is_test: testFile,
    });

    const importMap = new Map<string, string>();
    const definedNames = new Set<string>();
    this.collectFileScope(tree.rootNode, importMap, definedNames);

    const walkFn = this.extractFromTree.bind(this);
    walkFn(
      tree.rootNode, language, filePath, nodes, edges,
      null, null, importMap, definedNames, 0,
    );

    resolveCallTargets(nodes, edges, filePath);

    if (testFile) {
      generateTestEdges(nodes, edges);
    }

    return { nodes, edges };
  }

  // ── File scope pre-scan ──────────────────────────────────────────

  private collectFileScope(
    root: Node,
    importMap: Map<string, string>,
    definedNames: Set<string>,
  ): void {
    for (const child of root.children) {
      const nodeType = child.type;

      let target = child;
      if (nodeType === "export_statement") {
        for (const inner of child.children) {
          if (
            CLASS_TYPES.has(inner.type) ||
            FUNCTION_TYPES.has(inner.type) ||
            TYPE_TYPES.has(inner.type) ||
            inner.type === "lexical_declaration"
          ) {
            target = inner;
            break;
          }
        }
      }

      if (CLASS_TYPES.has(target.type) || FUNCTION_TYPES.has(target.type)) {
        const name = getName(target, CLASS_TYPES.has(target.type) ? "class" : "function");
        if (name) definedNames.add(name);
      }

      if (target.type === "lexical_declaration") {
        for (const decl of target.children) {
          if (decl.type === "variable_declarator") {
            const nameNode = decl.childForFieldName("name");
            const valueNode = decl.childForFieldName("value");
            if (nameNode && valueNode?.type === "arrow_function") {
              definedNames.add(getNodeText(nameNode));
            }
          }
        }
      }

      if (TYPE_TYPES.has(target.type)) {
        const name = getName(target, "type");
        if (name) definedNames.add(name);
      }

      if (IMPORT_TYPES.has(nodeType)) {
        const module = extractImportTarget(child);
        if (module) {
          for (const c of child.children) {
            if (c.type === "import_clause") {
              collectJsImportNames(c, module, importMap);
            }
          }
        }
      }
    }
  }

  // ── Recursive AST walk ───────────────────────────────────────────

  private static readonly MAX_DEPTH = 180;

  private extractFromTree(
    root: Node,
    language: string,
    filePath: string,
    nodes: NodeInfo[],
    edges: EdgeInfo[],
    enclosingClass: string | null,
    enclosingFunc: string | null,
    importMap: Map<string, string>,
    definedNames: Set<string>,
    depth: number,
  ): void {
    if (depth > CodeParser.MAX_DEPTH) return;

    const walkFn = this.extractFromTree.bind(this);
    const resolveCallFn = this.resolveCallTarget.bind(this);

    for (const child of root.children) {
      const nodeType = child.type;

      if (nodeType === "export_statement") {
        walkFn(
          child, language, filePath, nodes, edges,
          enclosingClass, enclosingFunc, importMap, definedNames, depth + 1,
        );
        continue;
      }

      if (CLASS_TYPES.has(nodeType)) {
        if (handleClass(walkFn, child, language, filePath, nodes, edges, enclosingClass, importMap, definedNames, depth)) continue;
      }

      if (TYPE_TYPES.has(nodeType)) {
        if (handleType(child, filePath, nodes, edges, enclosingClass, language)) continue;
      }

      if (FUNCTION_TYPES.has(nodeType)) {
        if (handleFunction(walkFn, child, nodeType, language, filePath, nodes, edges, enclosingClass, importMap, definedNames, depth)) continue;
      }

      if (nodeType === "lexical_declaration") {
        handleLexicalDeclaration(walkFn, child, language, filePath, nodes, edges, enclosingClass, importMap, definedNames, depth);
      }

      if (IMPORT_TYPES.has(nodeType)) {
        handleImport(child, filePath, edges);
        continue;
      }

      if (CALL_TYPES.has(nodeType)) {
        handleCall(resolveCallFn, child, filePath, enclosingClass, enclosingFunc, importMap, definedNames, edges);
      }

      walkFn(
        child, language, filePath, nodes, edges,
        enclosingClass, enclosingFunc, importMap, definedNames, depth + 1,
      );
    }
  }

  // ── Call target resolution ───────────────────────────────────────

  private resolveCallTarget(
    callName: string, filePath: string,
    importMap: Map<string, string>, definedNames: Set<string>,
  ): string {
    if (definedNames.has(callName)) return qualify(callName, filePath, null);
    if (importMap.has(callName)) {
      const resolved = this.resolveModuleCached(importMap.get(callName)!, filePath);
      if (resolved) return qualify(callName, resolved, null);
    }
    return callName;
  }

  private resolveModuleCached(module: string, callerFilePath: string): string | null {
    const cacheKey = `${dirname(callerFilePath)}:${module}`;
    if (this.moduleCache.has(cacheKey)) return this.moduleCache.get(cacheKey)!;
    const resolved = resolveModuleToFile(module, callerFilePath);
    if (this.moduleCache.size > 15000) this.moduleCache.clear();
    this.moduleCache.set(cacheKey, resolved);
    return resolved;
  }
}
