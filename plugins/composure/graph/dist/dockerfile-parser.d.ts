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
import type { EdgeInfo, NodeInfo } from "./types.js";
export declare function isDockerfileParseable(filePath: string): boolean;
export declare function parseDockerfile(filePath: string): {
    nodes: NodeInfo[];
    edges: EdgeInfo[];
};
