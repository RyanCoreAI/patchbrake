import type { Finding, ScanResult } from "../types";

const SARIF_VERSION = "2.1.0";

export function formatSarifReport(result: ScanResult): string {
  const ruleIds = Array.from(new Set(result.findings.map((finding) => finding.ruleId)));

  return JSON.stringify(
    {
      version: SARIF_VERSION,
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      runs: [
        {
          tool: {
            driver: {
              name: "PatchBrake",
              rules: ruleIds.map((ruleId) => ({
                id: ruleId,
                name: ruleId,
                shortDescription: {
                  text: `PatchBrake ${ruleId} finding`
                }
              }))
            }
          },
          results: result.findings.map(toSarifResult)
        }
      ]
    },
    null,
    2
  );
}

function toSarifResult(finding: Finding) {
  return {
    ruleId: finding.ruleId,
    level: toSarifLevel(finding.severity),
    message: {
      text: finding.message
    },
    locations: [
      {
        physicalLocation: {
          artifactLocation: {
            uri: finding.filePath
          },
          region: {
            startLine: finding.line ?? 1
          }
        }
      }
    ],
    partialFingerprints: {
      patchbrakeFingerprint: finding.fingerprint
    },
    properties: {
      category: finding.category,
      remediation: finding.remediation,
      excerpt: finding.excerpt
    }
  };
}

function toSarifLevel(severity: Finding["severity"]): "note" | "warning" | "error" {
  if (severity === "error") {
    return "error";
  }

  if (severity === "warn") {
    return "warning";
  }

  return "note";
}
