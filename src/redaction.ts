// Shared by all findings, since one source line can trigger several rules.
export const SECRET_ASSIGNMENT = /\b(?:api[_-]?key|token|secret|password|passwd|client[_-]?secret|private[_-]?key)\b["']?\s*[:=]\s*(?:"((?:\\.|[^"\\\r\n])*)"|'((?:\\.|[^'\\\r\n])*)'|([^\s"'#,;]+))/gi;

export function redactSecrets(content: string): string {
  return content
    .replace(/\bsk-[A-Za-z0-9_-]{8,}/g, "sk-...redacted")
    .replace(/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{8,}/g, "gh...redacted")
    .replace(/\bgithub_pat_[A-Za-z0-9_]{8,}/g, "github_pat_...redacted")
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, "AKIA...redacted")
    .replace(/-----BEGIN (?:RSA |EC |OPENSSH |DSA |)?PRIVATE KEY-----/gi, "-----BEGIN ... REDACTED PRIVATE KEY-----")
    .replace(new RegExp(SECRET_ASSIGNMENT.source, "gi"), match => {
      const separator = match.search(/[:=]/);
      return match.slice(0, separator + 1) + "[REDACTED]";
    });
}
