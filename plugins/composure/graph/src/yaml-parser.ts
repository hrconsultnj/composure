/**
 * Kubernetes manifest parser for YAML files.
 *
 * Parses .yaml/.yml files that contain K8s manifests (apiVersion + kind)
 * using regex. Supports multi-document YAML (--- separators).
 *
 * Node types emitted:
 * - File (the manifest file itself, language: "yaml")
 * - Resource (each K8s resource: Deployment, Service, ConfigMap, etc.)
 *
 * Edge types:
 * - CONTAINS (File → Resource)
 * - REFERENCES (Resource → other resources via configMapRef, secretRef,
 *   serviceAccountName, volume references, selector labels)
 */

import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import type { EdgeInfo, NodeInfo } from "./types.js";

// ── Detection ─────────────────────────────────────────────────────

export function isYamlParseable(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return ext === ".yaml" || ext === ".yml";
}

// ── Helpers ───────────────────────────────────────────────────────

function qualify(name: string, filePath: string, parent: string | null): string {
  return parent ? `${filePath}::${parent}.${name}` : `${filePath}::${name}`;
}

function findLineNumber(content: string, needle: string): number {
  const idx = content.indexOf(needle);
  if (idx === -1) return 1;
  return content.substring(0, idx).split("\n").length;
}

function lineCount(content: string): number {
  return content.split("\n").length;
}

// ── K8s detection ─────────────────────────────────────────────────

const API_VERSION_RE = /^apiVersion:\s*(\S+)/m;
const KIND_RE = /^kind:\s*(\S+)/m;
const NAME_RE = /^\s+name:\s*(\S+)/m;
const NAMESPACE_RE = /^\s+namespace:\s*(\S+)/m;

/** References to other K8s resources within a manifest document. */
const CONFIGMAP_NAME_RE = /configMapRef:\s*\n\s+name:\s*(\S+)/g;
const CONFIGMAP_VOL_RE = /configMap:\s*\n\s+name:\s*(\S+)/g;
const SECRET_REF_RE = /secretRef:\s*\n\s+name:\s*(\S+)/g;
const SECRET_NAME_RE = /secretName:\s*(\S+)/g;
const SERVICE_ACCOUNT_RE = /serviceAccountName:\s*(\S+)/g;
const CLAIM_NAME_RE = /claimName:\s*(\S+)/g;

// ── Main parser ──────────────────────────────────────────────────

export function parseYamlFile(filePath: string): { nodes: NodeInfo[]; edges: EdgeInfo[] } {
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return { nodes: [], edges: [] };
  }

  // Quick check: must have both apiVersion and kind to be a K8s manifest
  if (!API_VERSION_RE.test(content) || !KIND_RE.test(content)) {
    return { nodes: [], edges: [] };
  }

  const nodes: NodeInfo[] = [];
  const edges: EdgeInfo[] = [];
  const fileName = basename(filePath);
  const totalLines = lineCount(content);

  // File node
  const fileQN = filePath;
  nodes.push({
    kind: "File",
    name: fileName,
    file_path: filePath,
    line_start: 1,
    line_end: totalLines,
    language: "yaml",
    is_test: false,
  });

  // Split multi-document YAML (--- separator)
  const documents = content.split(/^---\s*$/m);
  let lineOffset = 0;

  for (const doc of documents) {
    if (!doc.trim()) {
      lineOffset += lineCount(doc);
      continue;
    }

    const apiVersionMatch = API_VERSION_RE.exec(doc);
    const kindMatch = KIND_RE.exec(doc);

    if (!apiVersionMatch || !kindMatch) {
      lineOffset += lineCount(doc);
      continue;
    }

    const apiVersion = apiVersionMatch[1];
    const kind = kindMatch[1];
    const nameMatch = NAME_RE.exec(doc);
    const name = nameMatch ? nameMatch[1] : "unnamed";
    const nsMatch = NAMESPACE_RE.exec(doc);
    const namespace = nsMatch ? nsMatch[1] : "default";

    const resourceName = `${kind}/${name}`;
    const docLines = lineCount(doc);
    const lineStart = lineOffset + 1;
    const lineEnd = lineOffset + docLines;
    const resourceQN = qualify(resourceName, filePath, fileName);

    nodes.push({
      kind: "Resource",
      name: resourceName,
      file_path: filePath,
      line_start: lineStart,
      line_end: lineEnd,
      language: "yaml",
      parent_name: fileName,
      summary: `${kind} in namespace ${namespace}`,
      is_test: false,
      extra: { apiVersion, kind, namespace, resourceName: name },
    });

    // CONTAINS edge: File → Resource
    edges.push({
      kind: "CONTAINS",
      source: fileQN,
      target: resourceQN,
      file_path: filePath,
      line: lineStart,
    });

    // Extract cross-resource references
    const refs = extractReferences(doc);
    for (const ref of refs) {
      edges.push({
        kind: "REFERENCES",
        source: resourceQN,
        target: ref.target,
        file_path: filePath,
        line: lineOffset + findLineNumber(doc, ref.match),
        extra: { refType: ref.type },
      });
    }

    lineOffset += docLines;
  }

  return { nodes, edges };
}

// ── Reference extraction ──────────────────────────────────────────

interface RefMatch {
  type: string;
  target: string;
  match: string;
}

function extractReferences(doc: string): RefMatch[] {
  const refs: RefMatch[] = [];
  const seen = new Set<string>();

  function addRef(type: string, name: string, match: string) {
    const key = `${type}:${name}`;
    if (!seen.has(key)) {
      seen.add(key);
      refs.push({ type, target: `ConfigMap/${name}`, match });
      // Adjust target based on ref type
      if (type === "configMap") refs[refs.length - 1].target = `ConfigMap/${name}`;
      else if (type === "secret") refs[refs.length - 1].target = `Secret/${name}`;
      else if (type === "serviceAccount") refs[refs.length - 1].target = `ServiceAccount/${name}`;
      else if (type === "pvc") refs[refs.length - 1].target = `PersistentVolumeClaim/${name}`;
    }
  }

  // ConfigMap references
  for (const re of [CONFIGMAP_NAME_RE, CONFIGMAP_VOL_RE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(doc)) !== null) {
      addRef("configMap", m[1], m[0]);
    }
  }

  // Secret references
  for (const re of [SECRET_REF_RE, SECRET_NAME_RE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(doc)) !== null) {
      addRef("secret", m[1], m[0]);
    }
  }

  // ServiceAccount references
  SERVICE_ACCOUNT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SERVICE_ACCOUNT_RE.exec(doc)) !== null) {
    addRef("serviceAccount", m[1], m[0]);
  }

  // PVC references
  CLAIM_NAME_RE.lastIndex = 0;
  while ((m = CLAIM_NAME_RE.exec(doc)) !== null) {
    addRef("pvc", m[1], m[0]);
  }

  return refs;
}
