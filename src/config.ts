import fs from "node:fs";
import path from "node:path";
import type { Config, ResolvedConfig, RuleConfigValue } from "./types";
import { matchesAnyGlob } from "./path-utils";
import { validateConfig } from "./config-validator";

const CONFIG_FILENAMES = [".patchbrakerc.json", "patchbrake.config.json"];

const DEFAULT_CONFIG: ResolvedConfig = {
  extends: [],
  rules: {},
  include: ["**"],
  exclude: ["node_modules/**", "dist/**", "coverage/**", ".git/**"],
  ignore: [],
  baselineFingerprints: new Set(),
  customRules: [],
  overrides: [],
  maxFileSizeBytes: 512_000,
  failOn: "error",
  outputFormat: "text",
  reportTimings: false
};

export function loadConfig(cwd: string, explicitPath?: string): ResolvedConfig {
  const configPath = explicitPath ? path.resolve(cwd, explicitPath) : findConfig(cwd);
  const parsed = configPath ? readConfigFile(configPath) : {};
  const extended = mergeExtends(cwd, parsed.extends ?? []);
  const merged = mergeConfig(extended, parsed);
  const baselinePath = resolveBaselinePath(cwd, merged.baseline);
  const baselineFingerprints = baselinePath ? readBaselineFingerprints(baselinePath) : new Set<string>();

  return {
    extends: merged.extends ?? DEFAULT_CONFIG.extends,
    rules: merged.rules ?? DEFAULT_CONFIG.rules,
    include: merged.include ?? DEFAULT_CONFIG.include,
    exclude: merged.exclude ?? DEFAULT_CONFIG.exclude,
    ignore: merged.ignore ?? DEFAULT_CONFIG.ignore,
    baseline: merged.baseline,
    baselinePath,
    baselineFingerprints,
    customRules: merged.customRules ?? DEFAULT_CONFIG.customRules,
    overrides: merged.overrides ?? DEFAULT_CONFIG.overrides,
    maxFileSizeBytes: merged.maxFileSizeBytes ?? DEFAULT_CONFIG.maxFileSizeBytes,
    failOn: merged.failOn ?? DEFAULT_CONFIG.failOn,
    outputFormat: merged.outputFormat ?? DEFAULT_CONFIG.outputFormat,
    reportTimings: merged.reportTimings ?? DEFAULT_CONFIG.reportTimings,
    configPath
  };
}

export function createDefaultConfig(): Config {
  return {
    failOn: "error",
    outputFormat: "text",
    include: ["**"],
    exclude: ["node_modules/**", "dist/**", "coverage/**", ".git/**"],
    baseline: ".patchbrake-baseline.json",
    ignore: [],
    rules: {
      "secret-leak": "error",
      "workflow-permissions": "warn",
      "migration-risk": "warn",
      "prompt-config-drift": "warn",
      "auth-regression": "warn",
      "package-script-risk": "warn",
      "dangerous-shell": "warn",
      "dependency-risk": "warn"
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

export function resolveConfigForPath(filePath: string, config: ResolvedConfig): ResolvedConfig {
  let scoped: ResolvedConfig = {
    ...config,
    rules: { ...config.rules },
    ignore: [...config.ignore],
    exclude: [...config.exclude]
  };

  for (const override of config.overrides) {
    if (!matchesAnyGlob(filePath, override.files)) {
      continue;
    }

    scoped = {
      ...scoped,
      rules: { ...scoped.rules, ...(override.rules ?? {}) },
      ignore: [...scoped.ignore, ...(override.ignore ?? [])],
      exclude: [...scoped.exclude, ...(override.exclude ?? [])]
    };
  }

  return scoped;
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

function readConfigFile(configPath: string): Config {
  const raw = fs.readFileSync(configPath, "utf8");

  try {
    const parsed = JSON.parse(raw) as unknown;
    validateConfig(parsed, configPath);
    return parsed;
  } catch (error) {
    if ((error as Error).message.startsWith("Invalid PatchBrake config")) {
      throw error;
    }

    throw new Error(`Invalid JSON config at ${configPath}: ${(error as Error).message}`);
  }
}

function mergeExtends(cwd: string, names: string[]): Config {
  return names.reduce((merged, name) => mergeConfig(merged, loadExtendedConfig(cwd, name)), {} as Config);
}

function loadExtendedConfig(cwd: string, name: string): Config {
  if (name === "patchbrake-config-node") {
    return {
      rules: {
        "package-script-risk": "warn",
        "dependency-risk": "warn"
      }
    };
  }

  if (name === "patchbrake-config-github-actions") {
    return {
      include: [".github/workflows/**"],
      rules: {
        "workflow-permissions": "error",
        "dangerous-shell": "warn"
      }
    };
  }

  if (name === "patchbrake-config-ai-coding") {
    return {
      rules: {
        "secret-leak": "error",
        "deleted-tests": "error",
        "workflow-permissions": "warn",
        "migration-risk": "warn",
        "prompt-config-drift": "warn",
        "auth-regression": "warn",
        "package-script-risk": "warn",
        "dangerous-shell": "warn",
        "dependency-risk": "warn"
      }
    };
  }

  if (/^https?:\/\//i.test(name)) {
    throw new Error(`Remote configs are not supported: ${name}`);
  }

  const configPath = name.startsWith(".") || path.isAbsolute(name) ? path.resolve(cwd, name) : require.resolve(name, { paths: [cwd] });
  return readConfigFile(configPath);
}

function mergeConfig(base: Config, next: Config): Config {
  return {
    ...base,
    ...next,
    extends: [...(base.extends ?? []), ...(next.extends ?? [])],
    rules: { ...(base.rules ?? {}), ...(next.rules ?? {}) },
    include: next.include ?? base.include,
    exclude: next.exclude ?? base.exclude,
    ignore: [...(base.ignore ?? []), ...(next.ignore ?? [])],
    customRules: [...(base.customRules ?? []), ...(next.customRules ?? [])],
    overrides: [...(base.overrides ?? []), ...(next.overrides ?? [])]
  };
}

function resolveBaselinePath(cwd: string, configuredBaseline?: string): string | undefined {
  const candidate = configuredBaseline ? path.resolve(cwd, configuredBaseline) : path.join(cwd, ".patchbrake-baseline.json");
  return fs.existsSync(candidate) ? candidate : configuredBaseline ? candidate : undefined;
}

function readBaselineFingerprints(baselinePath: string): Set<string> {
  if (!fs.existsSync(baselinePath)) {
    return new Set();
  }

  const raw = fs.readFileSync(baselinePath, "utf8");
  const parsed = JSON.parse(raw) as { findings?: Array<string | { fingerprint?: string }> };
  return new Set((parsed.findings ?? []).map((entry) => (typeof entry === "string" ? entry : entry.fingerprint)).filter(Boolean) as string[]);
}
