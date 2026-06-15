import type { ScanResult } from "../types";

export function formatTextReport(result: ScanResult): string {
  const { findings, files, rulesRun } = result;

  if (findings.length === 0) {
    return [
      "PatchBrake found no risky diffs.",
      `Scanned ${files.length} file(s) with ${rulesRun.length} rule(s).`
    ].join("\n");
  }

  const lines = [
    `PatchBrake found ${findings.length} risky diff finding(s).`,
    `Scanned ${files.length} file(s) with ${rulesRun.length} rule(s).`,
    ""
  ];

  for (const finding of findings) {
    const location = finding.line ? `${finding.filePath}:${finding.line}` : finding.filePath;
    lines.push(`${finding.severity.toUpperCase()} ${finding.ruleId} ${location}`);
    lines.push(`  ${finding.message}`);

    if (finding.excerpt) {
      lines.push(`  > ${finding.excerpt}`);
    }

    if (finding.remediation) {
      lines.push(`  Fix: ${finding.remediation}`);
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
