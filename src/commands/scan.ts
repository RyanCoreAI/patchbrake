import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "../config";
import { parseDiff } from "../diff-parser";
import { getRangeDiff, getStagedDiff, isInsideGitRepo } from "../git";
import { builtinRules } from "../rules";
import { runRules, shouldFail } from "../rule-engine";
import { formatJsonReport } from "../reporters/json";
import { formatSarifReport } from "../reporters/sarif";
import { formatTextReport } from "../reporters/text";
import type { OutputFormat, ScanOptions, ScanResult } from "../types";

export interface ScanCommandOptions {
  staged?: boolean;
  base?: string;
  head?: string;
  format?: OutputFormat;
  output?: string;
  config?: string;
  failOn?: "warn" | "error" | "never";
  cwd?: string;
}

export function runScan(options: ScanCommandOptions): { result: ScanResult; output: string; exitCode: number } {
  const cwd = path.resolve(options.cwd ?? process.cwd());

  if (!isInsideGitRepo(cwd)) {
    throw new Error(`Not inside a git repository: ${cwd}`);
  }

  const config = loadConfig(cwd, options.config);
  const format = options.format ?? config.outputFormat;
  const failOn = options.failOn ?? config.failOn;
  const staged = options.staged ?? !(options.base || options.head);

  if (!staged && (!options.base || !options.head)) {
    throw new Error("Use --staged or provide both --base and --head.");
  }

  const diff = staged ? getStagedDiff(cwd) : getRangeDiff(cwd, options.base!, options.head!);
  const files = parseDiff(diff);

  const scanOptions: ScanOptions = {
    cwd,
    staged,
    base: options.base,
    head: options.head,
    format,
    output: options.output,
    failOn,
    configPath: options.config
  };

  const result = runRules(files, builtinRules, config, scanOptions);
  const output = formatReport(result, format);
  const exitCode = shouldFail(result.findings, failOn) ? 1 : 0;

  if (options.output) {
    fs.writeFileSync(path.resolve(cwd, options.output), `${output}\n`, "utf8");
  }

  return { result, output, exitCode };
}

function formatReport(result: ScanResult, format: OutputFormat): string {
  if (format === "json") {
    return formatJsonReport(result);
  }

  if (format === "sarif") {
    return formatSarifReport(result);
  }

  return formatTextReport(result);
}
