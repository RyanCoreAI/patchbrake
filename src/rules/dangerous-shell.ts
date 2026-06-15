import type { Rule } from "../types";
import { getAddedLines, getFilePath } from "../diff-parser";

const SHELL_PATH_RE = /(^|\/)(scripts?|bin|\.github\/workflows)\/|\.sh$|\.bash$|\.ps1$|Dockerfile$/i;
const DANGEROUS_SHELL_RE = /\b(curl|wget)\b.*\|\s*(?:sh|bash)|\brm\s+-rf\s+(?:\/|\$[A-Z_]*|~)|chmod\s+777|Invoke-Expression|\biex\b|Set-ExecutionPolicy\s+Bypass/i;

export const dangerousShellRule: Rule = {
  id: "dangerous-shell",
  meta: {
    category: "shell",
    defaultSeverity: "warn",
    maturity: "beta",
    description: "Detects high-risk shell execution patterns added in scripts and workflows.",
    remediation: "Pin downloads, avoid pipe-to-shell patterns, and narrow destructive filesystem commands."
  },
  run(context) {
    const findings = [];

    for (const file of context.files) {
      const filePath = getFilePath(file);
      if (!SHELL_PATH_RE.test(filePath)) {
        continue;
      }

      for (const line of getAddedLines(file)) {
        const content = line.content.trim();
        if (!DANGEROUS_SHELL_RE.test(content)) {
          continue;
        }

        findings.push({
          ruleId: "dangerous-shell",
          category: "shell" as const,
          severity: "warn" as const,
          message: "Dangerous shell pattern added.",
          filePath,
          line: line.newLineNumber,
          excerpt: content,
          remediation: "Replace this with a pinned, auditable command and limit destructive scope."
        });
      }
    }

    return findings;
  }
};
