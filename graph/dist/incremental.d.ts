/**
 * Git-based change detection and incremental graph builds.
 *
 * Provides full builds (parse all files) and incremental updates
 * (parse only changed files + their dependents).
 */
import { GraphStore } from "./store.js";
import type { BuildResult } from "./types.js";
export declare function findRepoRoot(start?: string): string | null;
export declare function findProjectRoot(start?: string): string;
export declare function getDbPath(repoRoot: string): string;
export declare function getChangedFiles(repoRoot: string, base?: string): string[];
export declare function getStagedAndUnstaged(repoRoot: string): string[];
export declare function collectAllFiles(repoRoot: string): string[];
export declare function findDependents(store: GraphStore, filePath: string): string[];
export declare function fullBuild(repoRoot: string, store: GraphStore): Promise<BuildResult>;
export declare function incrementalUpdate(repoRoot: string, store: GraphStore, base?: string, changedFiles?: string[]): Promise<BuildResult>;
export declare function singleFileUpdate(repoRoot: string, store: GraphStore, filePath: string): Promise<void>;
