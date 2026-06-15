import type { Rule } from "../types";
import { getAddedLines, getFilePath } from "../diff-parser";
import { normalizePath } from "../path-utils";

const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |)?PRIVATE KEY-----/i },
  { name: "GitHub token", pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/ },
  { name: "GitHub fine-grained token", pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { name: "OpenAI API key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { name: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    name: "secret assignment",
    pattern:
      /\b(?:api[_-]?key|token|secret|password|passwd|client[_-]?secret|private[_-]?key)\b\s*[:=]\s*["']?[^"'\s#]{10,}/i
  }
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
        if (!content || content.startsWith("#") || isLikelyPlaceholder(content)) {
          continue;
        }

        const matched = SECRET_PATTERNS.find((entry) => entry.pattern.test(content));
        if (!matched && !(isEnvFile && /^[A-Z0-9_]{3,}\s*=/.test(content))) {
          continue;
        }

        findings.push({
          ruleId: "secret-leak",
          category: "secrets" as const,
          severity: "error" as const,
          message: matched ? `Possible ${matched.name} added in this diff.` : "Possible secret added to an env file.",
          filePath,
          line: line.newLineNumber,
          excerpt: redact(content),
          remediation: "Remove the value from git history, rotate it if real, and load it from environment or CI secrets."
        });
      }
    }

    return findings;
  }
};

function isLikelyPlaceholder(content: string): boolean {
  return (
    /\b(example|sample|placeholder|redacted|changeme|replace_me|your[_-]?key|dummy|test[_-]?only|xxxxx)\b/i.test(content) ||
    /\bsk-(?:test|example|placeholder|your[_-]?key)/i.test(content) ||
    /["']?\.\.\.["']?$/.test(content.trim())
  );
}

function redact(content: string): string {
  return content
    .replace(/\bsk-[A-Za-z0-9_-]{8,}/g, "sk-...redacted")
    .replace(/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{8,}/g, "gh...redacted")
    .replace(/\bgithub_pat_[A-Za-z0-9_]{8,}/g, "github_pat_...redacted")
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, "AKIA...redacted")
    .replace(/-----BEGIN (?:RSA |EC |OPENSSH |DSA |)?PRIVATE KEY-----/gi, "-----BEGIN ... REDACTED PRIVATE KEY-----")
    .replace(/([:=]\s*["']?)(?![^"'\s#]*redacted)([^"'\s#]{6})[^"'\s#]+/g, "$1$2...");
}
