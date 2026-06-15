import fs from "node:fs";
import path from "node:path";
import type { Config, ResolvedConfig, RuleConfigValue } from "./types";

const CONFIG_FILENAMES = [".patchbrakerc.json", "patchbrake.config.json"];

const DEFAULT_CONFIG: ResolvedConfig = {
  rules: {},
  include: ["**"],
  exclude: ["node_modules/**", "dist/**", "coverage/**", ".git/**"],
  maxFileSizeBytes: 512_000,
  failOn: "error",
  outputFormat: "text"
};

export function loadConfig(cwd: string, explicitPath?: string): ResolvedConfig {
  const configPath = explicitPath ? path.resolve(cwd, explicitPath) : findConfig(cwd);

  if (!configPath) {
    return { ...DEFAULT_CONFIG };
  }

  const raw = fs.readFileSync(configPath, "utf8");
  let parsed: Config;

  try {
    parsed = JSON.parse(raw) as Config;
  } catch (error) {
    throw new Error(`Invalid JSON config at ${configPath}: ${(error as Error).message}`);
  }

  return {
    rules: parsed.rules ?? DEFAULT_CONFIG.rules,
    include: parsed.include ?? DEFAULT_CONFIG.include,
    exclude: parsed.exclude ?? DEFAULT_CONFIG.exclude,
    maxFileSizeBytes: parsed.maxFileSizeBytes ?? DEFAULT_CONFIG.maxFileSizeBytes,
    failOn: parsed.failOn ?? DEFAULT_CONFIG.failOn,
    outputFormat: parsed.outputFormat ?? DEFAULT_CONFIG.outputFormat,
    configPath
  };
}

export function createDefaultConfig(): Config {
  return {
    failOn: "error",
    outputFormat: "text",
    include: ["**"],
    exclude: ["node_modules/**", "dist/**", "coverage/**", ".git/**"],
    rules: {
      "secret-leak": "error",
      "deleted-tests": "error",
      "workflow-permissions": "warn",
      "migration-risk": "warn",
      "prompt-config-drift": "warn"
    }
  };
}

export function getConfiguredSeverity(ruleId: string, defaultSeverity: RuleConfigValue, config: ResolvedConfig) {
  const value = config.rules[ruleId] ?? defaultSeverity;

  if (typeof value === "string") {
    return value;
  }

  if (value.enabled === false) {
    return "off";
  }

  return value.level ?? value.severity ?? "warn";
}

export function hasRuleSeverityOverride(ruleId: string, config: ResolvedConfig): boolean {
  return Object.prototype.hasOwnProperty.call(config.rules, ruleId);
}

function findConfig(cwd: string): string | undefined {
  for (const filename of CONFIG_FILENAMES) {
    const candidate = path.join(cwd, filename);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}
