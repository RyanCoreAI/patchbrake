import type { Config, IgnoreEntry, RuleConfigObject, RuleConfigValue } from "./types";

const TOP_LEVEL_KEYS = new Set([
  "extends",
  "rules",
  "include",
  "exclude",
  "ignore",
  "baseline",
  "customRules",
  "overrides",
  "maxFileSizeBytes",
  "failOn",
  "outputFormat",
  "reportTimings"
]);

const RULE_CONFIG_OBJECT_KEYS = new Set(["level", "severity", "enabled"]);
const IGNORE_ENTRY_KEYS = new Set(["fingerprint", "ruleId", "filePath", "line", "reason"]);
const OVERRIDE_KEYS = new Set(["files", "rules", "ignore", "exclude"]);
const SEVERITIES = new Set(["off", "info", "warn", "error"]);
const FAIL_ON_VALUES = new Set(["warn", "error", "never"]);
const OUTPUT_FORMATS = new Set(["text", "json", "sarif"]);

export function validateConfig(value: unknown, source: string): asserts value is Config {
  const config = requirePlainObject(value, source, "$");
  rejectUnknownKeys(config, TOP_LEVEL_KEYS, source, "$");

  if ("extends" in config) {
    requireStringArray(config.extends, source, "extends");
  }

  if ("rules" in config) {
    validateRules(config.rules, source, "rules");
  }

  if ("include" in config) {
    requireStringArray(config.include, source, "include");
  }

  if ("exclude" in config) {
    requireStringArray(config.exclude, source, "exclude");
  }

  if ("ignore" in config) {
    validateIgnore(config.ignore, source, "ignore");
  }

  if ("baseline" in config && typeof config.baseline !== "string") {
    invalidConfig(source, "baseline", "must be a string");
  }

  if ("customRules" in config) {
    requireStringArray(config.customRules, source, "customRules");
  }

  if ("overrides" in config) {
    validateOverrides(config.overrides, source, "overrides");
  }

  if ("maxFileSizeBytes" in config && (!Number.isInteger(config.maxFileSizeBytes) || (config.maxFileSizeBytes as number) <= 0)) {
    invalidConfig(source, "maxFileSizeBytes", "must be a positive integer");
  }

  if ("failOn" in config && !FAIL_ON_VALUES.has(String(config.failOn))) {
    invalidConfig(source, "failOn", "must be one of warn, error, or never");
  }

  if ("outputFormat" in config && !OUTPUT_FORMATS.has(String(config.outputFormat))) {
    invalidConfig(source, "outputFormat", "must be one of text, json, or sarif");
  }

  if ("reportTimings" in config && typeof config.reportTimings !== "boolean") {
    invalidConfig(source, "reportTimings", "must be a boolean");
  }
}

function validateOverrides(value: unknown, source: string, fieldPath: string): void {
  if (!Array.isArray(value)) {
    invalidConfig(source, fieldPath, "must be an array");
  }

  value.forEach((entry, index) => {
    const overridePath = `${fieldPath}[${index}]`;
    const override = requirePlainObject(entry, source, overridePath);
    rejectUnknownKeys(override, OVERRIDE_KEYS, source, overridePath);

    if (!("files" in override)) {
      invalidConfig(source, `${overridePath}.files`, "is required");
    }

    requireStringArray(override.files, source, `${overridePath}.files`);

    if ((override.files as string[]).length === 0) {
      invalidConfig(source, `${overridePath}.files`, "must include at least one glob");
    }

    if ("rules" in override) {
      validateRules(override.rules, source, `${overridePath}.rules`);
    }

    if ("ignore" in override) {
      validateIgnore(override.ignore, source, `${overridePath}.ignore`);
    }

    if ("exclude" in override) {
      requireStringArray(override.exclude, source, `${overridePath}.exclude`);
    }
  });
}

function validateRules(value: unknown, source: string, fieldPath: string): void {
  const rules = requirePlainObject(value, source, fieldPath) as Record<string, RuleConfigValue>;

  for (const [ruleId, ruleConfig] of Object.entries(rules)) {
    const rulePath = `${fieldPath}.${ruleId}`;

    if (typeof ruleConfig === "string") {
      validateSeverity(ruleConfig, source, rulePath);
      continue;
    }

    const objectConfig = requirePlainObject(ruleConfig, source, rulePath) as RuleConfigObject;
    rejectUnknownKeys(objectConfig, RULE_CONFIG_OBJECT_KEYS, source, rulePath);

    if ("level" in objectConfig && objectConfig.level !== undefined) {
      validateSeverity(objectConfig.level, source, `${rulePath}.level`);
    }

    if ("severity" in objectConfig && objectConfig.severity !== undefined) {
      validateSeverity(objectConfig.severity, source, `${rulePath}.severity`);
    }

    if ("enabled" in objectConfig && typeof objectConfig.enabled !== "boolean") {
      invalidConfig(source, `${rulePath}.enabled`, "must be a boolean");
    }
  }
}

function validateIgnore(value: unknown, source: string, fieldPath: string): void {
  if (!Array.isArray(value)) {
    invalidConfig(source, fieldPath, "must be an array");
  }

  value.forEach((entry, index) => {
    const entryPath = `${fieldPath}[${index}]`;

    if (typeof entry === "string") {
      return;
    }

    const ignoreEntryObject = requirePlainObject(entry, source, entryPath);
    const ignoreEntry = ignoreEntryObject as IgnoreEntry;
    rejectUnknownKeys(ignoreEntryObject, IGNORE_ENTRY_KEYS, source, entryPath);

    const hasMatcher = ["fingerprint", "ruleId", "filePath", "line"].some((key) => key in ignoreEntry);
    if (!hasMatcher) {
      invalidConfig(source, entryPath, "must include fingerprint, ruleId, filePath, or line");
    }

    for (const key of ["fingerprint", "ruleId", "filePath", "reason"] as const) {
      if (key in ignoreEntry && typeof ignoreEntry[key] !== "string") {
        invalidConfig(source, `${entryPath}.${key}`, "must be a string");
      }
    }

    if ("line" in ignoreEntry && (!Number.isInteger(ignoreEntry.line) || (ignoreEntry.line as number) <= 0)) {
      invalidConfig(source, `${entryPath}.line`, "must be a positive integer");
    }
  });
}

function validateSeverity(value: unknown, source: string, fieldPath: string): void {
  if (!SEVERITIES.has(String(value))) {
    invalidConfig(source, fieldPath, "must be one of off, info, warn, or error");
  }
}

function requireStringArray(value: unknown, source: string, fieldPath: string): asserts value is string[] {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    invalidConfig(source, fieldPath, "must be an array of strings");
  }
}

function requirePlainObject(value: unknown, source: string, fieldPath: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    invalidConfig(source, fieldPath, "must be an object");
  }

  return value as Record<string, unknown>;
}

function rejectUnknownKeys(value: Record<string, unknown>, allowedKeys: Set<string>, source: string, fieldPath: string): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      invalidConfig(source, `${fieldPath === "$" ? "" : `${fieldPath}.`}${key}`, "is not a supported field");
    }
  }
}

function invalidConfig(source: string, fieldPath: string, message: string): never {
  throw new Error(`Invalid PatchBrake config at ${source}: ${fieldPath} ${message}`);
}
