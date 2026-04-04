/**
 * Bidirectional sync between SQLite (free/offline) and Supabase (Pro/cloud).
 *
 * Use cases:
 * - Free→Pro upgrade: export local memory + thinking to Supabase
 * - Offline mode: sync Supabase → local SQLite for airplane/mobile
 * - Cloud→local toggle: user switches between adapters
 *
 * Conflict resolution: last-write-wins (by updated_at/created_at).
 * Memory edges are merged (union) — never deleted during sync.
 */
import type { StorageAdapter } from "./types.js";
import type { ToolResult } from "../core/types.js";
export interface SyncResult {
    direction: "up" | "down";
    sessions_synced: number;
    steps_synced: number;
    nodes_synced: number;
    edges_synced: number;
    conflicts: number;
    errors: string[];
}
/**
 * Sync UP: local SQLite → remote Supabase.
 * Used when upgrading from free to Pro, or going back online.
 */
export declare function syncUp(local: StorageAdapter, remote: StorageAdapter, agentId: string): Promise<ToolResult>;
/**
 * Sync DOWN: remote Supabase → local SQLite.
 * Used for offline mode or when user wants a local cache.
 */
export declare function syncDown(local: StorageAdapter, remote: StorageAdapter, agentId: string): Promise<ToolResult>;
/**
 * Get sync status — compare local vs remote counts.
 */
export declare function syncStatus(local: StorageAdapter, remote: StorageAdapter, agentId: string): Promise<ToolResult>;
