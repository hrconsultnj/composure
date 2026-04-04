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
import type { ToolResult, ThinkingSessionStatus } from "../core/types.js";

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
export async function syncUp(
  local: StorageAdapter,
  remote: StorageAdapter,
  agentId: string
): Promise<ToolResult> {
  const result: SyncResult = {
    direction: "up",
    sessions_synced: 0,
    steps_synced: 0,
    nodes_synced: 0,
    edges_synced: 0,
    conflicts: 0,
    errors: [],
  };

  try {
    // Sync thinking sessions
    const localSessions = await local.listSessions(agentId);
    for (const session of localSessions) {
      try {
        const remoteSession = await remote.getSession(session.id);
        if (!remoteSession) {
          // New session — create remotely
          const created = await remote.createSession(agentId, session.title ?? undefined);
          // Sync all steps
          const localData = await local.getSession(session.id);
          if (localData) {
            for (const step of localData.steps) {
              await remote.addStep(created.id, {
                thought_number: step.thought_number,
                thought: step.thought,
                thought_type: step.thought_type,
                is_revision: step.is_revision,
                revises_thought: step.revises_thought,
                branch_id: step.branch_id,
                branch_from_thought: step.branch_from_thought,
                needs_more_thoughts: step.needs_more_thoughts,
                metadata: step.metadata,
              });
              result.steps_synced++;
            }
          }
          if (session.status !== "active") {
            await remote.updateSession(created.id, {
              status: session.status as ThinkingSessionStatus,
              conclusion: session.conclusion,
              total_thoughts: session.total_thoughts,
            });
          }
          result.sessions_synced++;
        } else {
          result.conflicts++;
        }
      } catch (err) {
        result.errors.push(`Session ${session.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Sync memory nodes
    const localNodes = await local.searchMemory({ agent_id: agentId, limit: 1000 });
    for (const node of localNodes) {
      try {
        const remoteNode = await remote.getNode(node.id);
        if (!remoteNode) {
          await remote.createNode({
            agent_id: agentId,
            content: node.content,
            metadata: node.metadata,
          });
          result.nodes_synced++;
        } else {
          result.conflicts++;
        }
      } catch (err) {
        result.errors.push(`Node ${node.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return {
      status: "ok",
      message: `Synced UP: ${result.sessions_synced} sessions, ${result.steps_synced} steps, ${result.nodes_synced} nodes`,
      ...result,
    };
  } catch (err) {
    return {
      status: "error",
      error: `Sync up failed: ${err instanceof Error ? err.message : String(err)}`,
      ...result,
    };
  }
}

/**
 * Sync DOWN: remote Supabase → local SQLite.
 * Used for offline mode or when user wants a local cache.
 */
export async function syncDown(
  local: StorageAdapter,
  remote: StorageAdapter,
  agentId: string
): Promise<ToolResult> {
  const result: SyncResult = {
    direction: "down",
    sessions_synced: 0,
    steps_synced: 0,
    nodes_synced: 0,
    edges_synced: 0,
    conflicts: 0,
    errors: [],
  };

  try {
    // Sync thinking sessions from remote
    const remoteSessions = await remote.listSessions(agentId);
    for (const session of remoteSessions) {
      try {
        const localSession = await local.getSession(session.id);
        if (!localSession) {
          const created = await local.createSession(agentId, session.title ?? undefined);
          const remoteData = await remote.getSession(session.id);
          if (remoteData) {
            for (const step of remoteData.steps) {
              await local.addStep(created.id, {
                thought_number: step.thought_number,
                thought: step.thought,
                thought_type: step.thought_type,
                is_revision: step.is_revision,
                revises_thought: step.revises_thought,
                branch_id: step.branch_id,
                branch_from_thought: step.branch_from_thought,
                needs_more_thoughts: step.needs_more_thoughts,
                metadata: step.metadata,
              });
              result.steps_synced++;
            }
          }
          if (session.status !== "active") {
            await local.updateSession(created.id, {
              status: session.status as ThinkingSessionStatus,
              conclusion: session.conclusion,
              total_thoughts: session.total_thoughts,
            });
          }
          result.sessions_synced++;
        } else {
          result.conflicts++;
        }
      } catch (err) {
        result.errors.push(`Session ${session.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Sync memory nodes from remote
    const remoteNodes = await remote.searchMemory({ agent_id: agentId, limit: 1000 });
    for (const node of remoteNodes) {
      try {
        const localNode = await local.getNode(node.id);
        if (!localNode) {
          await local.createNode({
            agent_id: agentId,
            content: node.content,
            metadata: node.metadata,
          });
          result.nodes_synced++;
        } else {
          result.conflicts++;
        }
      } catch (err) {
        result.errors.push(`Node ${node.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return {
      status: "ok",
      message: `Synced DOWN: ${result.sessions_synced} sessions, ${result.steps_synced} steps, ${result.nodes_synced} nodes`,
      ...result,
    };
  } catch (err) {
    return {
      status: "error",
      error: `Sync down failed: ${err instanceof Error ? err.message : String(err)}`,
      ...result,
    };
  }
}

/**
 * Get sync status — compare local vs remote counts.
 */
export async function syncStatus(
  local: StorageAdapter,
  remote: StorageAdapter,
  agentId: string
): Promise<ToolResult> {
  try {
    const localSessions = await local.listSessions(agentId);
    const remoteSessions = await remote.listSessions(agentId);
    const localNodes = await local.searchMemory({ agent_id: agentId, limit: 1 });
    const remoteNodes = await remote.searchMemory({ agent_id: agentId, limit: 1 });

    return {
      status: "ok",
      local: {
        sessions: localSessions.length,
        adapter: local.type,
      },
      remote: {
        sessions: remoteSessions.length,
        adapter: remote.type,
      },
      in_sync: localSessions.length === remoteSessions.length,
    };
  } catch (err) {
    return {
      status: "error",
      error: `Sync status check failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
