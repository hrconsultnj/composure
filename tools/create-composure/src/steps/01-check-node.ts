/**
 * Step 01 — Verify Node.js >= 22.5 (required for built-in SQLite).
 */
export async function checkNode(): Promise<void> {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 5)) {
    throw new Error(
      `Node.js ${process.versions.node} found, but 22.5+ is required.\n` +
      `  Update: https://nodejs.org/en/download`
    );
  }
}
