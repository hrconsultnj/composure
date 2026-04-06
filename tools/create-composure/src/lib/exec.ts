import { execFile, execFileSync } from "node:child_process";

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run a command safely (no shell injection — uses execFile with array args).
 * Returns stdout, stderr, and exitCode. Never throws — check exitCode instead.
 */
export function execSafe(cmd: string, args: string[] = [], options: { cwd?: string } = {}): Promise<ExecResult> {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd: options.cwd, encoding: "utf-8" }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout?.toString().trim() ?? "",
        stderr: stderr?.toString().trim() ?? "",
        exitCode: error ? (error as NodeJS.ErrnoException & { code?: number }).code === undefined ? 1 : 1 : 0,
      });
    });
  });
}

/**
 * Synchronous version — returns stdout or empty string on failure.
 */
export function execSafeSync(cmd: string, args: string[] = []): string {
  try {
    return execFileSync(cmd, args, { encoding: "utf-8", stdio: "pipe" }).trim();
  } catch {
    return "";
  }
}

/**
 * Check if a command exists on PATH.
 */
export function commandExists(cmd: string): boolean {
  try {
    execFileSync("which", [cmd], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}
