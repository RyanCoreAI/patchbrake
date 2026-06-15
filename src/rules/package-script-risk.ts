import type { Rule } from "../types";
import { getAddedLines, getFilePath } from "../diff-parser";

const LIFECYCLE_SCRIPT_RE = /^\s*"(preinstall|install|postinstall|prepare|prepublish|prepublishOnly)"\s*:/;
const RISKY_SCRIPT_RE = /\b(curl|wget)\b.*\|\s*(?:sh|bash)|\b(?:bash|sh|powershell|pwsh)\s+-c\b|\bnode\s+-e\b|\brm\s+-rf\b|Invoke-Expression|\biex\b/i;

export const packageScriptRiskRule: Rule = {
  id: "package-script-risk",
  meta: {
    category: "package",
    defaultSeverity: "warn",
    maturity: "beta",
    description: "Detects risky npm lifecycle or shell-heavy package scripts added in package.json.",
    remediation: "Avoid install-time execution and keep package scripts auditable."
  },
  run(context) {
    const findings = [];

    for (const file of context.files) {
      const filePath = getFilePath(file);
      if (!filePath.endsWith("package.json")) {
        continue;
      }

      for (const line of getAddedLines(file)) {
        const content = line.content.trim();
        if (!LIFECYCLE_SCRIPT_RE.test(content) && !RISKY_SCRIPT_RE.test(content)) {
          continue;
        }

        findings.push({
          ruleId: "package-script-risk",
          category: "package" as const,
          severity: "warn" as const,
          message: "Risky package script added.",
          filePath,
          line: line.newLineNumber,
          excerpt: content,
          remediation: "Remove install-time execution or document why this script is safe."
        });
      }
    }

    return findings;
  }
};
