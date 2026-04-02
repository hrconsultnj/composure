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
import type { EdgeInfo, NodeInfo } from "./types.js";
export declare function isYamlParseable(filePath: string): boolean;
export declare function parseYamlFile(filePath: string): {
    nodes: NodeInfo[];
    edges: EdgeInfo[];
};
