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
import type { EdgeInfo, NodeInfo } from "./types.js";
export declare function isHclParseable(filePath: string): boolean;
export declare function parseHclFile(filePath: string): {
    nodes: NodeInfo[];
    edges: EdgeInfo[];
};
