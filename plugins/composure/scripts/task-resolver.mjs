#!/usr/bin/env node

/**
 * task-resolver.mjs — Map native Claude Code tasks to projects
 *
 * Resolves: ~/.claude/tasks/{session-uuid}/*.json → project
 * by matching the session UUID to session JSONL files under
 * ~/.claude/projects/{project-slug}/
 *
 * Usage:
 *   node task-resolver.mjs                    # Show all pending tasks by project
 *   node task-resolver.mjs --all              # Show all tasks including completed
 *   node task-resolver.mjs --project <name>   # Filter to one project
 *   node task-resolver.mjs --sync             # Write tasks-plans/.session-tasks.jsonl per project
 */

import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";

const CLAUDE_DIR = join(process.env.HOME, ".claude");
const TASKS_DIR = join(CLAUDE_DIR, "tasks");
const PROJECTS_DIR = join(CLAUDE_DIR, "projects");

const args = process.argv.slice(2);
const showAll = args.includes("--all");
const syncMode = args.includes("--sync");
const projectFilter = args.includes("--project")
  ? args[args.indexOf("--project") + 1]
  : null;

// ── Step 1: Build session → project index ───────────────────────
const sessionToProject = new Map();

for (const projectSlug of readdirSync(PROJECTS_DIR).filter(
  (f) => !f.startsWith(".") && !f.endsWith(".json")
)) {
  const projectDir = join(PROJECTS_DIR, projectSlug);
  let entries;
  try {
    entries = readdirSync(projectDir);
  } catch {
    continue;
  }

  for (const file of entries) {
    if (!file.endsWith(".jsonl")) continue;
    if (file.includes("/subagents/")) continue;
    const sessionId = file.replace(".jsonl", "");
    // Decode project name from slug
    const projectName = projectSlug
      .replace(/^-Users-[^-]+-Projects-/, "")
      .replace(/^-Users-[^-]+-/, "");
    sessionToProject.set(sessionId, {
      name: projectName || projectSlug,
      slug: projectSlug,
      path: projectDir,
    });
  }
}

// ── Step 2: Read all task folders ───────────────────────────────
const projectTasks = new Map(); // projectName → [{ sessionId, tasks: [...] }]
let orphanedSessions = [];

let taskDirs;
try {
  taskDirs = readdirSync(TASKS_DIR).filter(
    (f) => !f.startsWith(".") && f.includes("-")
  );
} catch {
  console.error("No tasks directory found at", TASKS_DIR);
  process.exit(1);
}

for (const sessionUuid of taskDirs) {
  const sessionDir = join(TASKS_DIR, sessionUuid);
  let files;
  try {
    files = readdirSync(sessionDir).filter((f) => f.endsWith(".json"));
  } catch {
    continue;
  }

  if (files.length === 0) continue;

  const tasks = [];
  for (const file of files) {
    try {
      const data = JSON.parse(readFileSync(join(sessionDir, file), "utf8"));
      tasks.push({
        id: data.id,
        subject: data.subject,
        description: data.description || "",
        status: data.status || "unknown",
        blocks: data.blocks || [],
        blockedBy: data.blockedBy || [],
        activeForm: data.activeForm || "",
      });
    } catch {
      // Skip malformed
    }
  }

  if (tasks.length === 0) continue;

  const project = sessionToProject.get(sessionUuid);
  if (project) {
    if (projectFilter && !project.name.includes(projectFilter)) continue;

    if (!projectTasks.has(project.name)) {
      projectTasks.set(project.name, []);
    }
    projectTasks.get(project.name).push({
      sessionId: sessionUuid,
      tasks,
      projectSlug: project.slug,
    });
  } else {
    orphanedSessions.push({ sessionId: sessionUuid, tasks });
  }
}

// ── Step 3: Output ──────────────────────────────────────────────
if (syncMode) {
  // Write .session-tasks.jsonl to each project's tasks-plans/
  for (const [projectName, sessions] of projectTasks) {
    // Resolve actual project directory from the slug
    const firstSession = sessions[0];
    const projectSlug = firstSession.projectSlug;

    // Try to find the real project path from the session JSONL
    const sessionFile = join(PROJECTS_DIR, projectSlug, `${firstSession.sessionId}.jsonl`);
    let projectRoot = null;

    // Try ALL sessions for this project (most recent first — current session more likely valid)
    for (const sess of [...sessions].reverse()) {
      const sf = join(PROJECTS_DIR, projectSlug, `${sess.sessionId}.jsonl`);
      try {
        const content = readFileSync(sf, "utf8");
        const lines = content.split("\n").slice(0, 50);
        for (const line of lines) {
          if (!line.includes('"cwd"')) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.cwd && existsSync(parsed.cwd)) {
              projectRoot = parsed.cwd;
              break;
            }
          } catch { /* skip malformed */ }
        }
        if (projectRoot) break;
      } catch {
        continue;
      }
    }

    // Fallback: if resolved cwd doesn't exist (project moved/renamed),
    // try to find a match by basename in common project directories
    if (!projectRoot || !existsSync(projectRoot)) {
      const stalePath = projectRoot; // save for reporting
      projectRoot = null;

      // Extract the project basename from any cwd we found (even stale)
      const candidates = [];
      for (const sess of sessions) {
        const sf = join(PROJECTS_DIR, projectSlug, `${sess.sessionId}.jsonl`);
        try {
          const content = readFileSync(sf, "utf8");
          const line = content.split("\n").find((l) => l.includes('"cwd"'));
          if (line) {
            const parsed = JSON.parse(line);
            if (parsed.cwd) candidates.push(basename(parsed.cwd));
          }
        } catch { /* skip */ }
      }

      // Search common project roots for a directory with matching basename
      const searchRoots = [
        join(process.env.HOME, "Projects"),
        join(process.env.HOME, "Projects/composure"),
      ];
      const targetName = [...new Set(candidates)][0];
      if (targetName) {
        for (const root of searchRoots) {
          const candidate = join(root, targetName);
          if (existsSync(candidate)) {
            projectRoot = candidate;
            console.log(`[relocated] ${projectName}: ${stalePath || "unknown"} → ${projectRoot}`);
            break;
          }
        }
      }
    }

    if (!projectRoot || !existsSync(projectRoot)) {
      // Report orphaned with stale paths for user to decide
      const stalePaths = [];
      for (const sess of sessions) {
        const sf = join(PROJECTS_DIR, projectSlug, `${sess.sessionId}.jsonl`);
        try {
          const content = readFileSync(sf, "utf8");
          const line = content.split("\n").find((l) => l.includes('"cwd"'));
          if (line) stalePaths.push(JSON.parse(line).cwd);
        } catch { /* skip */ }
      }
      const pending = sessions.flatMap((s) => s.tasks).filter((t) => t.status !== "completed" && t.status !== "deleted").length;
      console.log(`[orphaned] ${projectName} — ${pending} pending tasks, last known path: ${[...new Set(stalePaths)].join(", ") || "unknown"}`);
      continue;
    }

    const tasksPlanDir = join(projectRoot, "tasks-plans");
    if (!existsSync(tasksPlanDir)) {
      mkdirSync(tasksPlanDir, { recursive: true });
    }

    const ledgerPath = join(tasksPlanDir, ".session-tasks.jsonl");
    const lines = [];

    for (const session of sessions) {
      for (const task of session.tasks) {
        lines.push(
          JSON.stringify({
            task_id: task.id,
            subject: task.subject,
            description: task.description,
            status: task.status,
            session_id: session.sessionId,
            project: projectName,
            synced_at: new Date().toISOString(),
          })
        );
      }
    }

    writeFileSync(ledgerPath, lines.join("\n") + "\n");
    const pending = sessions.flatMap((s) => s.tasks).filter((t) => t.status !== "completed" && t.status !== "deleted").length;
    const total = sessions.flatMap((s) => s.tasks).length;
    console.log(`[synced] ${projectName} → ${ledgerPath} (${pending} pending / ${total} total)`);
  }
} else {
  // Display mode
  for (const [projectName, sessions] of [...projectTasks].sort((a, b) => a[0].localeCompare(b[0]))) {
    const allTasks = sessions.flatMap((s) =>
      s.tasks.map((t) => ({ ...t, sessionId: s.sessionId }))
    );

    const pending = allTasks.filter(
      (t) => t.status !== "completed" && t.status !== "deleted"
    );
    const completed = allTasks.filter((t) => t.status === "completed");

    if (!showAll && pending.length === 0) continue;

    console.log(`\n## ${projectName} (${sessions.length} sessions, ${pending.length} pending, ${completed.length} done)`);

    const display = showAll ? allTasks : pending;
    for (const t of display) {
      const status =
        t.status === "completed" ? "x"
        : t.status === "in_progress" ? "~"
        : " ";
      const sessionShort = t.sessionId.slice(0, 8);
      console.log(`  [${status}] #${t.id} ${t.subject} (${sessionShort})`);
    }
  }

  if (orphanedSessions.length > 0 && showAll) {
    const orphanTasks = orphanedSessions.flatMap((s) => s.tasks);
    console.log(
      `\n## [orphaned] (${orphanedSessions.length} sessions, ${orphanTasks.length} tasks — no matching project)`
    );
  }

  // Summary
  const totalPending = [...projectTasks.values()]
    .flatMap((s) => s.flatMap((sess) => sess.tasks))
    .filter((t) => t.status !== "completed" && t.status !== "deleted").length;
  const totalProjects = projectTasks.size;
  console.log(`\n--- ${totalPending} pending tasks across ${totalProjects} projects ---`);
}
