import type { Rule } from "../types";
import { getAddedLines, getFilePath } from "../diff-parser";
import { isWorkflowPath } from "../path-utils";

const RISKY_PERMISSION_RE = /^\s*(?:permissions:\s*write-all|(?:contents|actions|checks|deployments|id-token|packages|pull-requests|repository-projects|security-events):\s*write)\s*$/i;

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

        if (RISKY_PERMISSION_RE.test(content)) {
          findings.push({
            ruleId: "workflow-permissions",
            category: "workflow" as const,
            severity: "warn" as const,
            message: "Workflow permission was widened to write scope.",
            filePath,
            line: line.newLineNumber,
            excerpt: content.trim(),
            remediation: "Restrict the permission to the minimum read/write scope needed for this job."
          });
        }
      }
    }

    return findings;
  }
};
