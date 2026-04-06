#!/usr/bin/env node

import { Command } from "commander";
import { installCommand } from "./commands/install.js";

const program = new Command();

program
  .name("create-composure")
  .description("Install Composure — universal code quality enforcement for AI coding tools")
  .version("1.0.0");

program
  .option("--skip-auth", "Skip authentication (do it later via /composure:auth login)")
  .option("--skip-claude", "Don't offer to install Claude Code")
  .option("--skip-adapters", "Don't generate rules files for non-Claude tools")
  .option("--plugins <list>", "Comma-separated plugin list (default: composure,sentinel,shipyard,testbench,design-forge)")
  .option("--non-interactive", "Accept all defaults, no prompts (for CI/scripts)")
  .action(installCommand);

program.parse();
