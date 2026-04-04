/**
 * Thinking session management — create, resume, complete, list.
 *
 * All functions take a StorageAdapter as the first parameter,
 * keeping them transport- and storage-agnostic.
 */
import { getTemplate, listTemplates } from "./templates/index.js";
export async function createSession(adapter, params) {
    try {
        let template = null;
        if (params.template_id) {
            template = getTemplate(params.template_id);
            if (!template) {
                return {
                    status: "error",
                    error: `Unknown template: ${params.template_id}`,
                    available_templates: listTemplates(),
                };
            }
        }
        const title = params.title ?? template?.name ?? undefined;
        const session = await adapter.createSession(params.agent_id, title);
        const result = {
            status: "ok",
            session_id: session.id,
            id_prefix: session.id_prefix,
            title: session.title,
            message: "Thinking session created",
        };
        if (template) {
            const firstStep = template.steps[0];
            result.template = template.id;
            result.total_steps = template.steps.length;
            result.next_prompt = firstStep?.prompt ?? null;
            result.next_thought_type = firstStep?.thought_type ?? null;
        }
        return result;
    }
    catch (err) {
        return {
            status: "error",
            error: `Failed to create session: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}
export async function resumeSession(adapter, params) {
    try {
        const result = await adapter.getSession(params.session_id);
        if (!result) {
            return { status: "not_found", error: `Session ${params.session_id} not found` };
        }
        const { session, steps } = result;
        const branches = [...new Set(steps.map((s) => s.branch_id).filter(Boolean))];
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
    }
    catch (err) {
        return {
            status: "error",
            error: `Failed to resume session: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}
export async function completeSession(adapter, params) {
    try {
        const updated = await adapter.updateSession(params.session_id, {
            status: "completed",
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
    }
    catch (err) {
        return {
            status: "error",
            error: `Failed to complete session: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}
export async function listSessions(adapter, params) {
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
    }
    catch (err) {
        return {
            status: "error",
            error: `Failed to list sessions: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}
//# sourceMappingURL=session.js.map