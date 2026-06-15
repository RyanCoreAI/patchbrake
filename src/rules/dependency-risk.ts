import type { Rule } from "../types";
import { getAddedLines, getFilePath } from "../diff-parser";

const RISKY_VERSION_RE = /^\s*"[^"]+"\s*:\s*"(?:\*|latest|next|file:|link:|https?:\/\/|git\+|github:)/i;

export const dependencyRiskRule: Rule = {
  id: "dependency-risk",
  meta: {
    category: "dependency",
    defaultSeverity: "warn",
    maturity: "beta",
    description: "Detects risky dependency specifiers added to package manifests.",
    remediation: "Pin dependencies to registry versions or document why the non-registry source is trusted."
  },
  run(context) {
    const findings = [];

    for (const file of context.files) {
      const filePath = getFilePath(file);
      if (!/(^|\/)package\.json$/.test(filePath)) {
        continue;
      }

      for (const line of getAddedLines(file)) {
        const content = line.content.trim();
        if (!RISKY_VERSION_RE.test(content)) {
          continue;
        }

        findings.push({
          ruleId: "dependency-risk",
          category: "dependency" as const,
          severity: "warn" as const,
          message: "Risky dependency specifier added.",
          filePath,
          line: line.newLineNumber,
          excerpt: content,
          remediation: "Use a pinned semver range from the package registry when possible."
        });
      }
    }

    return findings;
  }
};
