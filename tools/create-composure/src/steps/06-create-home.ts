/**
 * Step 06 — Create the global ~/.composure/ scaffold.
 */

import { mkdir, chmod } from "node:fs/promises";
import { join } from "node:path";
import { homedir, platform } from "node:os";

export async function createHome(): Promise<string> {
  const home = join(homedir(), ".composure");

  await mkdir(join(home, "bin"), { recursive: true });
  await mkdir(join(home, "cache"), { recursive: true });
  await mkdir(join(home, "cortex"), { recursive: true });
  await mkdir(join(home, "worktrees"), { recursive: true });

  // Set directory permissions (700 — owner only) on POSIX systems
  if (platform() !== "win32") {
    await chmod(home, 0o700);
  }

  return home;
}
