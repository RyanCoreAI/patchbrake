import type { Rule } from "../types";
import { getAddedLines, getFilePath } from "../diff-parser";
import { isWorkflowPath } from "../path-utils";

export const GITHUB_TOKEN_WRITE_PERMISSIONS = new Set([
  "actions",
  "artifact-metadata",
  "attestations",
  "checks",
  "code-quality",
  "contents",
  "deployments",
  "discussions",
  "id-token",
  "issues",
  "packages",
  "pages",
  "pull-requests",
  "security-events",
  "statuses"
]);

export const workflowPermissionsRule: Rule = {
  id: "workflow-permissions",
  meta: {
    category: "workflow",
    defaultSeverity: "warn",
    description: "Detects risky GitHub Actions permission or trigger changes.",
    remediation: "Use the narrowest workflow permissions and avoid pull_request_target unless the workflow is hardened."
  },
  run(context) {
    const findings = [];

    for (const file of context.files) {
      const filePath = getFilePath(file);
      if (!isWorkflowPath(filePath)) {
        continue;
      }

      for (const line of getAddedLines(file)) {
        const content = line.content;

        if (/^\s*pull_request_target\s*:/i.test(content)) {
          findings.push({
            ruleId: "workflow-permissions",
            category: "workflow" as const,
            severity: "error" as const,
            message: "pull_request_target trigger added.",
            filePath,
            line: line.newLineNumber,
            excerpt: content.trim(),
            remediation: "Use pull_request when possible. If pull_request_target is required, do not checkout untrusted code before privileged steps."
          });
          continue;
        }

        const riskyPermission = getRiskyPermission(content);
        if (riskyPermission) {
          findings.push({
            ruleId: "workflow-permissions",
            category: "workflow" as const,
            severity: "warn" as const,
            message:
              riskyPermission === "id-token"
                ? "Workflow OIDC token permission was widened to id-token: write."
                : "Workflow permission was widened to write scope.",
            filePath,
            line: line.newLineNumber,
            excerpt: content.trim(),
            remediation:
              riskyPermission === "id-token"
                ? "Only grant id-token: write to trusted OIDC deployment jobs with narrow cloud trust policies."
                : "Restrict the permission to the minimum read/write scope needed for this job."
          });
        }
      }
    }

    return findings;
  }
};

function getRiskyPermission(content: string): string | undefined {
  if (/^\s*permissions:\s*write-all\s*(?:#.*)?$/i.test(content)) {
    return "write-all";
  }

  const match = content.match(/^\s*([a-z-]+):\s*write\s*(?:#.*)?$/i);
  if (!match) {
    return undefined;
  }

  const permission = match[1].toLowerCase();
  return GITHUB_TOKEN_WRITE_PERMISSIONS.has(permission) ? permission : undefined;
}
