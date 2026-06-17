import type { ScanResult } from "../types";

export function formatJsonReport(result: ScanResult): string {
  const activeFindings = result.findings.filter((finding) => !finding.suppressed);
  const suppressedFindings = result.findings.filter((finding) => finding.suppressed);
  const payload: Record<string, unknown> = {
    summary: {
      filesScanned: result.files.length,
      filesSkipped: result.skippedFiles.length,
      rulesRun: result.rulesRun.length,
      findings: activeFindings.length,
      suppressedFindings: suppressedFindings.length,
      errors: activeFindings.filter((finding) => finding.severity === "error").length,
      warnings: activeFindings.filter((finding) => finding.severity === "warn").length,
      infos: activeFindings.filter((finding) => finding.severity === "info").length
    },
    rulesRun: result.rulesRun,
    skippedFiles: result.skippedFiles,
    findings: result.findings
  };

  if (result.reportTimings) {
    payload.ruleTimings = result.ruleTimings;
  }

  return JSON.stringify(
    payload,
    null,
    2
  );
}
