/**
 * Main install pipeline — orchestrates all 10 steps.
 */

import kleur from "kleur";
import ora from "ora";
import { nudgeIfNeeded } from "../lib/detect-runner.js";
import { logger } from "../lib/logger.js";
import { checkNode } from "../steps/01-check-node.js";
import { detectTools } from "../steps/02-detect-tools.js";
import { selectTools } from "../steps/03-select-tools.js";
import { installClaude } from "../steps/04-install-claude.js";
import { installPlugins } from "../steps/05-install-plugins.js";
import { createHome } from "../steps/06-create-home.js";
import { linkBinaries } from "../steps/07-link-binaries.js";
import { authenticate } from "../steps/08-authenticate.js";
import { generateAdapters } from "../steps/09-generate-adapters.js";
import { printSummary } from "../steps/10-print-summary.js";
import { commandExists, execSafe } from "../lib/exec.js";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promptConfirm } from "../lib/prompts.js";

export interface InstallOptions {
  skipAuth?: boolean;
  skipClaude?: boolean;
  skipAdapters?: boolean;
  plugins?: string;
  nonInteractive?: boolean;
}

export async function installCommand(options: InstallOptions): Promise<void> {
  console.log(`\n${kleur.bold().blue("create-composure")}\n`);
  console.log(`${kleur.gray("Universal code quality enforcement for AI coding tools")}\n`);

  // Nudge if invoked via npm/npx
  nudgeIfNeeded();

  const nonInteractive = options.nonInteractive ?? false;
  const pluginList = options.plugins
    ? options.plugins.split(",").map((p) => p.trim())
    : [];

  try {
    // ── Step 01: Check Node.js ──────────────────────────────────
    const nodeSpinner = ora("Checking Node.js version...").start();
    await checkNode();
    nodeSpinner.succeed(`Node.js ${process.versions.node}`);

    // ── Step 02: Detect tools ───────────────────────────────────
    const detectSpinner = ora("Detecting AI coding tools...").start();
    const detected = await detectTools();
    const detectedNames = Object.entries(detected)
      .filter(([, v]) => v.found)
      .map(([k]) => k);
    detectSpinner.succeed(
      detectedNames.length > 0
        ? `Found: ${detectedNames.join(", ")}`
        : "No AI tools detected"
    );

    // ── Step 03: Select tools ───────────────────────────────────
    const selectedTools = await selectTools(detected, nonInteractive);

    if (selectedTools.length === 0 && !nonInteractive) {
      logger.warn("No tools selected. You can always re-run create-composure later.");
    }

    // ── Step 04: Install Claude Code ────────────────────────────
    const claudeNewlyInstalled = await installClaude({
      skipClaude: options.skipClaude ?? false,
      nonInteractive,
      selectedTools,
    });
    if (claudeNewlyInstalled) {
      logger.success("Claude Code CLI installed");
    }

    // ── Step 05: Install plugins ────────────────────────────────
    const pluginSpinner = ora("Checking Composure plugins...").start();
    const { installed: installedPlugins, skipped: pluginsSkipped, alreadyInstalled } =
      await installPlugins({ plugins: pluginList, selectedTools });

    if (pluginsSkipped) {
      pluginSpinner.info("Plugin installation deferred (no Claude Code)");
    } else if (alreadyInstalled.length === installedPlugins.length && alreadyInstalled.length > 0) {
      pluginSpinner.succeed(`All plugins up to date: ${installedPlugins.join(", ")}`);
    } else if (installedPlugins.length > 0) {
      pluginSpinner.succeed(`Plugins: ${installedPlugins.join(", ")}`);
    } else {
      pluginSpinner.warn("No plugins installed — push manifest fix to marketplace, then run again");
    }

    // ── Step 06: Create ~/.composure/ ───────────────────────────
    const homeSpinner = ora("Creating ~/.composure/...").start();
    const composureHome = await createHome();
    homeSpinner.succeed(`Created ${composureHome}`);

    // ── Step 07: Link binaries ──────────────────────────────────
    const linkSpinner = ora("Linking CLI commands...").start();
    const { linked } = await linkBinaries();
    if (linked > 0) {
      linkSpinner.succeed(`Linked ${linked} CLI commands`);
    } else {
      linkSpinner.info("CLI commands will be linked on first Claude Code session");
    }

    // ── Step 07b: Detect & offer migration ────────────────────────
    // If user is in a project with .claude/no-bandaids.json but no .composure/,
    // they installed via the old curl | sh script and need migration.
    const cwd = process.cwd();
    const hasLegacyConfig = existsSync(join(cwd, ".claude", "no-bandaids.json"));
    const hasNewConfig = existsSync(join(cwd, ".composure", "no-bandaids.json"));

    if (hasLegacyConfig && !hasNewConfig) {
      logger.info("Detected legacy .claude/ config from previous install");
      const authBin = join(composureHome, "bin", "composure-auth.mjs");

      if (existsSync(authBin)) {
        const wantsMigrate = nonInteractive || await promptConfirm(
          "Migrate project configs to .composure/? (.claude/ files kept as backup)"
        );
        if (wantsMigrate) {
          const migrateSpinner = ora("Migrating configs...").start();
          const result = await execSafe("node", [authBin, "migrate"]);
          if (result.exitCode === 0) {
            migrateSpinner.succeed("Migrated .claude/ → .composure/");
          } else {
            migrateSpinner.warn("Migration had issues — run `composure-auth migrate` manually");
          }
        }
      } else {
        logger.info("Run `composure-auth migrate` after install to migrate project configs");
      }
    }

    // ── Step 08: Authenticate ───────────────────────────────────
    // No prompt — checks status, if not logged in, opens browser automatically.
    const authSpinner = ora("Checking authentication...").start();
    const { authenticated, email, plan } = await authenticate({
      skipAuth: options.skipAuth ?? false,
      nonInteractive,
    });
    if (authenticated) {
      authSpinner.succeed(`Authenticated${email ? ` as ${email}` : ""}${plan ? ` (${plan} plan)` : ""}`);
    } else if (options.skipAuth) {
      authSpinner.info("Auth skipped (use /composure:auth login later)");
    } else {
      authSpinner.info("Auth deferred — run /composure:auth login in Claude Code");
    }

    // ── Step 09: Generate adapters ──────────────────────────────
    const adapterSpinner = ora("Generating platform adapters...").start();
    const { generated } = await generateAdapters({
      skipAdapters: options.skipAdapters ?? false,
      selectedTools,
    });
    if (generated.length > 0) {
      adapterSpinner.succeed(`Adapters: ${generated.join(", ")}`);
    } else {
      adapterSpinner.info("No adapters generated (run in a project directory)");
    }

    // ── Step 10: Summary ────────────────────────────────────────
    printSummary({
      selectedTools,
      installedPlugins,
      authenticated,
      email,
      plan,
      composureHome,
      linkedBinaries: linked,
      generatedAdapters: generated,
      claudeInstalled: commandExists("claude"),
    });
  } catch (error) {
    logger.error(
      `\nFailed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}
