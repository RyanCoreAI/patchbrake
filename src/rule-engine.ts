import type { DiffFile, Finding, FindingDraft, ResolvedConfig, Rule, RuleContext, ScanOptions, Severity } from "./types";
import { getConfiguredSeverity, hasRuleSeverityOverride } from "./config";
import { getFilePath } from "./diff-parser";
import { matchesAnyGlob } from "./path-utils";

const SEVERITY_RANK: Record<Exclude<Severity, "off">, number> = {
  info: 1,
  warn: 2,
  error: 3
};

export function runRules(files: RuleContext["files"], rules: Rule[], config: ResolvedConfig, options: ScanOptions) {
  const filteredFiles = files.filter((file) => shouldScanFile(file, config));
  const findings: Finding[] = [];
  const rulesRun: string[] = [];

  for (const rule of rules) {
    const configuredSeverity = getConfiguredSeverity(rule.id, rule.meta.defaultSeverity, config);
    const hasSeverityOverride = hasRuleSeverityOverride(rule.id, config);
    if (configuredSeverity === "off") {
      continue;
    }

    rulesRun.push(rule.id);
    const context: RuleContext = {
      files: filteredFiles,
      config,
      options
    };

    const drafts = rule.run(context);
    for (const draft of drafts) {
      const severity = normalizeDraftSeverity(draft, configuredSeverity, hasSeverityOverride);
      if (severity === "off") {
        continue;
      }

      findings.push({
        ...draft,
        severity,
        fingerprint: createFindingFingerprint(draft),
        id: createFindingId(draft, findings.length)
      });
    }
  }

  return {
    files: filteredFiles,
    findings,
    rulesRun
  };
}

export function shouldFail(findings: Finding[], failOn: "warn" | "error" | "never"): boolean {
  if (failOn === "never") {
    return false;
  }

  const threshold = failOn === "error" ? SEVERITY_RANK.error : SEVERITY_RANK.warn;
  return findings.some((finding) => SEVERITY_RANK[finding.severity] >= threshold);
}

function shouldScanFile(file: DiffFile, config: ResolvedConfig): boolean {
  const path = getFilePath(file);
  const included = config.include.length === 0 || matchesAnyGlob(path, config.include);
  const excluded = matchesAnyGlob(path, config.exclude);
  const withinSizeLimit = getDiffByteSize(file) <= config.maxFileSizeBytes;
  return included && !excluded && withinSizeLimit;
}

function getDiffByteSize(file: DiffFile): number {
  return Buffer.byteLength(file.hunks.flatMap((hunk) => hunk.lines.map((line) => line.raw)).join("\n"), "utf8");
}

function normalizeDraftSeverity(draft: FindingDraft, configuredSeverity: Severity, hasSeverityOverride: boolean): Severity {
  if (configuredSeverity === "off") {
    return configuredSeverity;
  }

  if (hasSeverityOverride) {
    return configuredSeverity;
  }

  return draft.severity ?? configuredSeverity;
}

function createFindingId(draft: FindingDraft, index: number): string {
  const location = draft.line ? `${draft.filePath}:${draft.line}` : draft.filePath;
  return `${draft.ruleId}:${location}:${index + 1}`;
}

function createFindingFingerprint(draft: FindingDraft): string {
  return `${draft.ruleId}:${draft.filePath}:${draft.line ?? 0}:${draft.message}`;
}
