import type { ScanResult } from "../types";

export function formatTextReport(result: ScanResult): string {
  const { findings, files, rulesRun } = result;
  const activeFindings = findings.filter((finding) => !finding.suppressed);
  const suppressedFindings = findings.filter((finding) => finding.suppressed);

  if (activeFindings.length === 0) {
    return [
      "PatchBrake found no risky diffs.",
      `Scanned ${files.length} file(s), skipped ${result.skippedFiles.length} file(s), ran ${rulesRun.length} rule(s).`,
      suppressedFindings.length > 0 ? `Suppressed ${suppressedFindings.length} finding(s).` : undefined,
      formatTimings(result)
    ]
      .filter(Boolean)
      .join("\n");
  }

  const lines = [
    `PatchBrake found ${activeFindings.length} risky diff finding(s).`,
    `Scanned ${files.length} file(s), skipped ${result.skippedFiles.length} file(s), ran ${rulesRun.length} rule(s).`,
    suppressedFindings.length > 0 ? `Suppressed ${suppressedFindings.length} finding(s).` : undefined,
    ""
  ].filter((line): line is string => line !== undefined);

  for (const finding of activeFindings) {
    lines.push(formatFinding(finding));
    lines.push("");
  }

  if (suppressedFindings.length > 0) {
    lines.push("Suppressed findings:");
    for (const finding of suppressedFindings) {
      const location = finding.line ? `${finding.filePath}:${finding.line}` : finding.filePath;
      lines.push(`  ${finding.ruleId} ${location} (${finding.suppressed?.kind}: ${finding.suppressed?.reason ?? "suppressed"})`);
    }
    lines.push("");
  }

  if (result.skippedFiles.length > 0) {
    lines.push("Skipped files:");
    for (const skipped of result.skippedFiles) {
      lines.push(`  ${skipped.filePath} (${skipped.reason}: ${skipped.detail ?? "skipped"})`);
    }
    lines.push("");
  }

  const timings = formatTimings(result);
  if (timings) {
    lines.push(timings);
  }

  return lines.join("\n").trimEnd();
}

function formatFinding(finding: ScanResult["findings"][number]): string {
  const lines = [];
  const location = finding.line ? `${finding.filePath}:${finding.line}` : finding.filePath;
  lines.push(`${finding.severity.toUpperCase()} ${finding.ruleId} ${location}`);
  lines.push(`  ${finding.message}`);

  if (finding.excerpt) {
    lines.push(`  > ${finding.excerpt}`);
  }

  if (finding.remediation) {
    lines.push(`  Fix: ${finding.remediation}`);
  }

  return lines.join("\n");
}

function formatTimings(result: ScanResult): string | undefined {
  if (result.ruleTimings.length === 0) {
    return undefined;
  }

  const total = result.ruleTimings.reduce((sum, timing) => sum + timing.durationMs, 0);
  return `Rule timing: ${total.toFixed(3)}ms total.`;
}
