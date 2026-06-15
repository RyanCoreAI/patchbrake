#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { createDefaultConfig } from "./config";
import { getGitVersion, isInsideGitRepo } from "./git";
import { builtinRules } from "./rules";
import { runScan } from "./commands/scan";
import type { OutputFormat } from "./types";

const program = new Command();

program
  .name("patchbrake")
  .description("A local safety gate for AI-generated patches.")
  .version("0.1.0");

program
  .command("scan")
  .description("Scan staged changes or a commit range for risky AI-generated patch patterns.")
  .option("--staged", "scan staged changes")
  .option("--base <ref>", "base git ref for range scanning")
  .option("--head <ref>", "head git ref for range scanning")
  .option("--format <format>", "output format: text, json, or sarif", parseFormat)
  .option("--output <path>", "write report to a file")
  .option("--config <path>", "path to .patchbrakerc.json")
  .option("--fail-on <level>", "exit with code 1 on warn, error, or never", parseFailOn)
  .option("--cwd <path>", "working directory")
  .action((options) => {
    try {
      const { output, exitCode } = runScan(options);
      if (!options.output) {
        process.stdout.write(`${output}\n`);
      }
      process.exitCode = exitCode;
    } catch (error) {
      process.stderr.write(`PatchBrake error: ${(error as Error).message}\n`);
      process.exitCode = 2;
    }
  });

program
  .command("init")
  .description("Create a starter .patchbrakerc.json file.")
  .option("--cwd <path>", "working directory")
  .option("--force", "overwrite an existing config file")
  .action((options) => {
    const cwd = path.resolve(options.cwd ?? process.cwd());
    const configPath = path.join(cwd, ".patchbrakerc.json");

    if (fs.existsSync(configPath) && !options.force) {
      process.stderr.write(`Config already exists: ${configPath}\n`);
      process.exitCode = 1;
      return;
    }

    fs.writeFileSync(configPath, `${JSON.stringify(createDefaultConfig(), null, 2)}\n`, "utf8");
    process.stdout.write(`Created ${configPath}\n`);
  });

program
  .command("rules")
  .description("List built-in rules.")
  .action(() => {
    for (const rule of builtinRules) {
      process.stdout.write(`${rule.id}\n`);
      process.stdout.write(`  category: ${rule.meta.category}\n`);
      process.stdout.write(`  default severity: ${rule.meta.defaultSeverity}\n`);
      process.stdout.write(`  ${rule.meta.description}\n\n`);
    }
  });

program
  .command("explain")
  .description("Explain a built-in rule.")
  .argument("<ruleId>", "rule id")
  .action((ruleId) => {
    const rule = builtinRules.find((candidate) => candidate.id === ruleId);
    if (!rule) {
      process.stderr.write(`Unknown rule: ${ruleId}\n`);
      process.exitCode = 1;
      return;
    }

    process.stdout.write(`${rule.id}\n`);
    process.stdout.write(`Category: ${rule.meta.category}\n`);
    process.stdout.write(`Default severity: ${rule.meta.defaultSeverity}\n`);
    process.stdout.write(`Description: ${rule.meta.description}\n`);
    process.stdout.write(`Remediation: ${rule.meta.remediation}\n`);
  });

program
  .command("doctor")
  .description("Check local PatchBrake prerequisites.")
  .option("--cwd <path>", "working directory")
  .action((options) => {
    const cwd = path.resolve(options.cwd ?? process.cwd());
    const gitVersion = getGitVersion(cwd);
    const insideRepo = isInsideGitRepo(cwd);

    process.stdout.write(`Node: ${process.version}\n`);
    process.stdout.write(`Git: ${gitVersion ?? "not found"}\n`);
    process.stdout.write(`Inside git repository: ${insideRepo ? "yes" : "no"}\n`);
    process.exitCode = gitVersion && insideRepo ? 0 : 1;
  });

program.parse();

function parseFormat(value: string): OutputFormat {
  if (value !== "text" && value !== "json" && value !== "sarif") {
    throw new Error("format must be text, json, or sarif");
  }
  return value;
}

function parseFailOn(value: string): "warn" | "error" | "never" {
  if (value !== "warn" && value !== "error" && value !== "never") {
    throw new Error("fail-on must be warn, error, or never");
  }
  return value;
}
