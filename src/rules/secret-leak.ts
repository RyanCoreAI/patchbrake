import type { Rule } from "../types";
import { getAddedLines, getFilePath } from "../diff-parser";
import { normalizePath } from "../path-utils";
import { redactSecrets, SECRET_ASSIGNMENT } from "../redaction";

const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |)?PRIVATE KEY-----/i },
  { name: "GitHub token", pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/ },
  { name: "GitHub fine-grained token", pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { name: "OpenAI API key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { name: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ }
];

export const secretLeakRule: Rule = {
  id: "secret-leak",
  meta: {
    category: "secrets",
    defaultSeverity: "error",
    description: "Detects likely secrets added in the diff.",
    remediation: "Move the value to a secret manager or environment variable and rotate it if it was real."
  },
  run(context) {
    const findings = [];

    for (const file of context.files) {
      const filePath = getFilePath(file);
      const normalizedPath = normalizePath(filePath).toLowerCase();
      const isEnvFile = /(^|\/)\.env(\.|$)/.test(normalizedPath);

      for (const line of getAddedLines(file)) {
        const content = line.content.trim();
        if (!content) {
          continue;
        }

        const matched = SECRET_PATTERNS.find(entry => {
          const value = content.match(entry.pattern)?.[0];
          return value !== undefined && !isLikelyPlaceholder(value);
        });
        const assignment = [...content.matchAll(new RegExp(SECRET_ASSIGNMENT.source, "gi"))]
          .some(match => {
            const value = match[1] ?? match[2] ?? match[3] ?? "";
            return value.length >= 10 && !isLikelyPlaceholder(value);
          });
        const envValue = isEnvFile ? content.match(/^[A-Z0-9_]{3,}\s*=\s*(.*)$/)?.[1] : undefined;
        const envSecret = envValue !== undefined && envValue.length > 0 && !isLikelyPlaceholder(envValue.replace(/^["']|["']$/g, ""));
        if (!matched && !assignment && !envSecret) {
          continue;
        }

        findings.push({
          ruleId: "secret-leak",
          category: "secrets" as const,
          severity: "error" as const,
          message: matched ? `Possible ${matched.name} added in this diff.` : assignment ? "Possible secret assignment added in this diff." : "Possible secret added to an env file.",
          filePath,
          line: line.newLineNumber,
          excerpt: redactSecrets(content),
          remediation: "Remove the value from git history, rotate it if real, and load it from environment or CI secrets."
        });
      }
    }

    return findings;
  }
};

function isLikelyPlaceholder(content: string): boolean {
  return (
    /^(?:example|sample|placeholder|redacted|changeme|replace_me|your[_-]?key(?:[_-]here)?|dummy|test[_-]?only|xxxxx)$/i.test(content) ||
    /^sk-(?:test|example|placeholder|your[_-]?key)(?:\.\.\.)?$/i.test(content) ||
    /^\.\.\.$/.test(content.trim())
  );
}
