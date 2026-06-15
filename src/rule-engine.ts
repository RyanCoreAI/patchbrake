import crypto from "node:crypto";
import type { DiffFile, Finding, FindingDraft, IgnoreEntry, ResolvedConfig, Rule, RuleContext, ScanOptions, Severity, SkippedFile } from "./types";
import { getConfiguredSeverity, hasRuleSeverityOverride, resolveConfigForPath } from "./config";
import { getFilePath } from "./diff-parser";
import { matchesAnyGlob } from "./path-utils";

const SEVERITY_RANK: Record<Exclude<Severity, "off">, number> = {
  info: 1,
  warn: 2,
  error: 3
};

export function runRules(files: RuleContext["files"], rules: Rule[], config: ResolvedConfig, options: ScanOptions) {
  const { scannedFiles, skippedFiles } = filterFiles(files, config);
  const findings: Finding[] = [];
  const rulesRun: string[] = [];
  const ruleTimings = [];

  for (const rule of rules) {
    const configuredSeverity = getConfiguredSeverity(rule.id, rule.meta.defaultSeverity, config);
    const hasSeverityOverride = hasRuleSeverityOverride(rule.id, config);
    if (configuredSeverity === "off") {
      continue;
    }

    rulesRun.push(rule.id);
    const context: RuleContext = {
      files: scannedFiles,
      config,
      options
    };

    const startedAt = performance.now();
    const drafts = rule.run(context);
    ruleTimings.push({
      ruleId: rule.id,
      durationMs: roundDuration(performance.now() - startedAt)
    });

    for (const draft of drafts) {
      const fileConfig = resolveConfigForPath(draft.filePath, config);
      const fileSeverity = getConfiguredSeverity(rule.id, rule.meta.defaultSeverity, fileConfig);
      const severity = normalizeDraftSeverity(draft, fileSeverity, hasSeverityOverride || hasRuleSeverityOverride(rule.id, fileConfig));
      if (severity === "off") {
        continue;
      }

      const finding: Finding = {
        ...draft,
        severity,
        fingerprint: createFindingFingerprint(draft),
        id: createFindingId(draft, findings.length)
      };
      finding.suppressed = getSuppression(finding, scannedFiles, fileConfig, options);
      findings.push(finding);
    }
  }

  return {
    files: scannedFiles,
    findings,
    rulesRun,
    skippedFiles,
    ruleTimings
  };
}

export function shouldFail(findings: Finding[], failOn: "warn" | "error" | "never"): boolean {
  if (failOn === "never") {
    return false;
  }

  const threshold = failOn === "error" ? SEVERITY_RANK.error : SEVERITY_RANK.warn;
  return findings.some((finding) => !finding.suppressed && SEVERITY_RANK[finding.severity] >= threshold);
}

function filterFiles(files: DiffFile[], config: ResolvedConfig): { scannedFiles: DiffFile[]; skippedFiles: SkippedFile[] } {
  const scannedFiles = [];
  const skippedFiles = [];

  for (const file of files) {
    const filePath = getFilePath(file);
    const fileConfig = resolveConfigForPath(filePath, config);
    const included = fileConfig.include.length === 0 || matchesAnyGlob(filePath, fileConfig.include);
    const excluded = matchesAnyGlob(filePath, fileConfig.exclude);

    if (!included || excluded) {
      skippedFiles.push({
        filePath,
        reason: "excluded" as const,
        detail: excluded ? "Matched exclude pattern." : "Did not match include pattern."
      });
      continue;
    }

    const byteSize = getDiffByteSize(file);
    if (byteSize > fileConfig.maxFileSizeBytes) {
      skippedFiles.push({
        filePath,
        reason: "too-large" as const,
        detail: `${byteSize} bytes exceeds maxFileSizeBytes=${fileConfig.maxFileSizeBytes}.`
      });
      continue;
    }

    scannedFiles.push(file);
  }

  return { scannedFiles, skippedFiles };
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
  return crypto
    .createHash("sha256")
    .update([draft.ruleId, draft.filePath, draft.message, draft.excerpt ?? ""].join("\n"))
    .digest("hex")
    .slice(0, 24);
}

function getSuppression(finding: Finding, files: DiffFile[], config: ResolvedConfig, options: ScanOptions) {
  if (!options.ignoreBaseline && config.baselineFingerprints.has(finding.fingerprint)) {
    return {
      kind: "baseline" as const,
      reason: config.baselinePath ? `Matched ${config.baselinePath}.` : "Matched baseline."
    };
  }

  const ignoreEntry = config.ignore.find((entry) => matchesIgnoreEntry(finding, entry));
  if (ignoreEntry) {
    return {
      kind: "config" as const,
      reason: typeof ignoreEntry === "string" ? "Matched configured fingerprint." : ignoreEntry.reason ?? "Matched configured ignore entry."
    };
  }

  const file = files.find((candidate) => getFilePath(candidate) === finding.filePath);
  if (file && hasInlineIgnore(file, finding)) {
    return {
      kind: "inline" as const,
      reason: "Matched patchbrake inline ignore comment."
    };
  }

  return undefined;
}

function matchesIgnoreEntry(finding: Finding, entry: string | IgnoreEntry): boolean {
  if (typeof entry === "string") {
    return entry === finding.fingerprint;
  }

  if (entry.fingerprint && entry.fingerprint !== finding.fingerprint) {
    return false;
  }

  if (entry.ruleId && entry.ruleId !== finding.ruleId) {
    return false;
  }

  if (entry.filePath && !matchesAnyGlob(finding.filePath, [entry.filePath])) {
    return false;
  }

  if (entry.line && entry.line !== finding.line) {
    return false;
  }

  return Boolean(entry.fingerprint || entry.ruleId || entry.filePath || entry.line);
}

function hasInlineIgnore(file: DiffFile, finding: Finding): boolean {
  const inlineLines = file.hunks.flatMap((hunk) => hunk.lines);

  return inlineLines.some((line) => {
    if (!line.content.includes("patchbrake-ignore")) {
      return false;
    }

    const appliesToRule = line.content.includes(finding.ruleId) || /patchbrake-ignore(?:-next-line|-file)?(?:\s|$)/.test(line.content);
    if (!appliesToRule) {
      return false;
    }

    if (line.content.includes("patchbrake-ignore-file")) {
      return true;
    }

    if (line.content.includes("patchbrake-ignore-next-line")) {
      return line.newLineNumber !== undefined && finding.line !== undefined && line.newLineNumber + 1 === finding.line;
    }

    return line.newLineNumber === finding.line || line.oldLineNumber === finding.line;
  });
}

function roundDuration(durationMs: number): number {
  return Math.round(durationMs * 1000) / 1000;
}
