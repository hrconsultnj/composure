/**
 * Thinking session management — create, resume, complete, list.
 *
 * All functions take a StorageAdapter as the first parameter,
 * keeping them transport- and storage-agnostic.
 */

import type { ToolResult, ThinkingSessionStatus } from "../types.js";
import type { StorageAdapter } from "../../adapters/types.js";

export async function createSession(
  adapter: StorageAdapter,
  params: { agent_id: string; title?: string }
): Promise<ToolResult> {
  try {
    const session = await adapter.createSession(params.agent_id, params.title);
    return {
      status: "ok",
      session_id: session.id,
      id_prefix: session.id_prefix,
      title: session.title,
      message: "Thinking session created",
    };
  } catch (err) {
    return {
      status: "error",
      error: `Failed to create session: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function resumeSession(
  adapter: StorageAdapter,
  params: { session_id: string }
): Promise<ToolResult> {
  try {
    const result = await adapter.getSession(params.session_id);
    if (!result) {
      return { status: "not_found", error: `Session ${params.session_id} not found` };
    }

    const { session, steps } = result;
    const branches = [...new Set(steps.map((s) => s.branch_id).filter(Boolean))] as string[];
    const mainSteps = steps.filter((s) => !s.branch_id);
    const lastStep = mainSteps[mainSteps.length - 1];

    return {
      status: "ok",
      session,
      steps,
      summary: {
        total_thoughts: session.total_thoughts,
        branches: branches.length,
        last_thought_number: lastStep?.thought_number ?? 0,
        last_thought_type: lastStep?.thought_type ?? null,
        needs_more: lastStep?.needs_more_thoughts ?? false,
      },
    };
  } catch (err) {
    return {
      status: "error",
      error: `Failed to resume session: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function completeSession(
  adapter: StorageAdapter,
  params: { session_id: string; conclusion?: string }
): Promise<ToolResult> {
  try {
    const updated = await adapter.updateSession(params.session_id, {
      status: "completed" as ThinkingSessionStatus,
      conclusion: params.conclusion ?? null,
    });

    if (!updated) {
      return { status: "not_found", error: `Session ${params.session_id} not found` };
    }

    return {
      status: "ok",
      session_id: updated.id,
      final_status: updated.status,
      conclusion: updated.conclusion,
      total_thoughts: updated.total_thoughts,
    };
  } catch (err) {
    return {
      status: "error",
      error: `Failed to complete session: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function listSessions(
  adapter: StorageAdapter,
  params: { agent_id: string; status?: ThinkingSessionStatus }
): Promise<ToolResult> {
  try {
    const sessions = await adapter.listSessions(params.agent_id, params.status);
    return {
      status: "ok",
      count: sessions.length,
      sessions: sessions.map((s) => ({
        id: s.id,
        id_prefix: s.id_prefix,
        title: s.title,
        status: s.status,
        total_thoughts: s.total_thoughts,
        created_at: s.created_at,
        updated_at: s.updated_at,
      })),
    };
  } catch (err) {
    return {
      status: "error",
      error: `Failed to list sessions: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
