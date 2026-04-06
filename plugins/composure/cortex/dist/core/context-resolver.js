/**
 * Context resolver for external thought capture.
 *
 * Reads project + task context from the filesystem. Used by
 * captureExternalThought to link reasoning to the current task.
 *
 * NOTE: This file runs in both Node (CLI) and adapter context.
 * It must NOT import any MCP-specific or Claude-Code-specific APIs.
 * Task context comes from a file-based contract: `.composure/current-task.json`
 * which the task-state-writer hook writes on task state changes.
 */
export async function resolveCaptureContext(input) {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const taskFile = join(input.project_root, ".composure", "current-task.json");
    let task_id;
    let task_subject;
    try {
        const raw = await readFile(taskFile, "utf8");
        const data = JSON.parse(raw);
        task_id = data.task_id ?? undefined;
        task_subject = data.task_subject ?? undefined;
    }
    catch {
        // File missing or unreadable — no current task context. Fine.
    }
    return {
        project_name: input.project_name,
        project_root: input.project_root,
        task_id,
        task_subject,
    };
}
//# sourceMappingURL=context-resolver.js.map