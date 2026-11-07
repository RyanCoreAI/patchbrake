import crypto from "node:crypto";
import type { DiffFile, Finding, FindingDraft, IgnoreEntry, ResolvedConfig, Rule, RuleContext, ScanOptions, Severity, SkippedFile } from "./types";
import { getConfiguredSeverity, hasRuleSeverityOverride, resolveConfigForPath } from "./config";
import { getFilePath } from "./diff-parser";
import { matchesAnyGlob } from "./path-utils";
import { redactSecrets } from "./redaction";

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

  findings.push(...createInlineIgnoreFindings(scannedFiles, findings.length, options));

  return {
    files: scannedFiles,
    findings: findings.map(finding => ({
      ...finding,
      message: redactSecrets(finding.message),
      excerpt: finding.excerpt === undefined ? undefined : redactSecrets(finding.excerpt),
      remediation: finding.remediation === undefined ? undefined : redactSecrets(finding.remediation),
      suppressed: finding.suppressed ? { ...finding.suppressed, reason: finding.suppressed.reason === undefined ? undefined : redactSecrets(finding.suppressed.reason) } : undefined
    })),
    rulesRun,
    skippedFiles,
    ruleTimings,
    reportTimings: config.reportTimings
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
  if (!options.disallowInlineIgnore && file && hasInlineIgnore(file, finding)) {
    return {
      kind: "inline" as const,
      reason: "Matched patchbrake inline ignore comment."
    };
  }

  return undefined;
}

function createInlineIgnoreFindings(files: DiffFile[], offset: number, options: ScanOptions): Finding[] {
  if (!options.disallowInlineIgnore && !options.failOnNewIgnore) {
    return [];
  }

  const drafts: FindingDraft[] = [];
  const severity = options.failOnNewIgnore ? "error" : "warn";
  const message = options.disallowInlineIgnore
    ? "PatchBrake inline ignore was added while inline ignores are disallowed."
    : "PatchBrake inline ignore was added in this diff.";

  for (const file of files) {
    const filePath = getFilePath(file);
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type !== "add" || !line.content.includes("patchbrake-ignore")) {
          continue;
        }

        drafts.push({
          ruleId: "inline-ignore",
          category: "unknown",
          severity,
          message,
          filePath,
          line: line.newLineNumber,
          excerpt: line.content.trim(),
          remediation: "Remove the inline ignore or move the exception to reviewed config/baseline."
        });
      }
    }
  }

  return drafts.map((draft, index) => ({
    ...draft,
    severity: draft.severity as Exclude<Severity, "off">,
    fingerprint: createFindingFingerprint(draft),
    id: createFindingId(draft, offset + index)
  }));
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
    if (line.type === "remove" || !line.content.includes("patchbrake-ignore")) {
      return false;
    }

    const directives = line.content.matchAll(/\bpatchbrake-ignore(-next-line|-file)?(?=$|[\s*])(?:[ \t]+([^\s*]+))?/g);
    for (const directive of directives) {
      // A named exception belongs only to that exact rule. A bare directive
      // retains the existing all-rules behavior.
      if (directive[2] && directive[2] !== finding.ruleId) continue;
      if (directive[1] === "-file") return true;
      if (directive[1] === "-next-line") {
        if (line.newLineNumber !== undefined && finding.line !== undefined && line.newLineNumber + 1 === finding.line) return true;
      } else if (line.newLineNumber === finding.line) {
        return true;
      }
    }
    return false;
  });
}

function roundDuration(durationMs: number): number {
  return Math.round(durationMs * 1000) / 1000;
}
