/**
 * Session summarization — aggregate a thinking session into a structured summary.
 */

import type { ToolResult, SessionSummary } from "../types.js";
import type { StorageAdapter } from "../../adapters/types.js";

export async function summarizeSession(
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
    const revisionCount = steps.filter((s) => s.is_revision).length;

    // Find conclusion: explicit session conclusion, or last "conclusion" type step
    const conclusionStep = steps
      .filter((s) => s.thought_type === "conclusion")
      .pop();

    const summary: SessionSummary = {
      session_id: session.id,
      title: session.title,
      status: session.status,
      total_thoughts: session.total_thoughts,
      branches,
      revision_count: revisionCount,
      conclusion: session.conclusion ?? conclusionStep?.thought ?? null,
      created_at: session.created_at,
    };

    return {
      status: "ok",
      summary,
      thought_chain: steps
        .filter((s) => !s.branch_id)
        .map((s) => ({
          number: s.thought_number,
          type: s.thought_type,
          thought: s.thought,
          is_revision: s.is_revision,
        })),
      branch_chains: Object.fromEntries(
        branches.map((branch) => [
          branch,
          steps
            .filter((s) => s.branch_id === branch)
            .map((s) => ({
              number: s.thought_number,
              type: s.thought_type,
              thought: s.thought,
            })),
        ])
      ),
    };
  } catch (err) {
    return {
      status: "error",
      error: `Failed to summarize session: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
