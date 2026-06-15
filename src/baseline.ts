import fs from "node:fs";
import path from "node:path";
import type { BaselineFile, Finding } from "./types";

export function createBaselineFile(findings: Finding[]): BaselineFile {
  const unique = new Map<string, Finding>();

  for (const finding of findings) {
    unique.set(finding.fingerprint, finding);
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    findings: Array.from(unique.values())
      .sort((left, right) => `${left.ruleId}:${left.filePath}`.localeCompare(`${right.ruleId}:${right.filePath}`))
      .map((finding) => ({
        fingerprint: finding.fingerprint,
        ruleId: finding.ruleId,
        filePath: finding.filePath,
        message: finding.message,
        reason: "Existing finding accepted into baseline."
      }))
  };
}

export function writeBaseline(cwd: string, outputPath: string, findings: Finding[]): string {
  const baseline = createBaselineFile(findings);
  const targetPath = path.resolve(cwd, outputPath);
  fs.writeFileSync(targetPath, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
  return targetPath;
}
