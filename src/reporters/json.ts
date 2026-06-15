import type { ScanResult } from "../types";

export function formatJsonReport(result: ScanResult): string {
  return JSON.stringify(
    {
      summary: {
        filesScanned: result.files.length,
        rulesRun: result.rulesRun.length,
        findings: result.findings.length,
        errors: result.findings.filter((finding) => finding.severity === "error").length,
        warnings: result.findings.filter((finding) => finding.severity === "warn").length,
        infos: result.findings.filter((finding) => finding.severity === "info").length
      },
      rulesRun: result.rulesRun,
      findings: result.findings
    },
    null,
    2
  );
}
