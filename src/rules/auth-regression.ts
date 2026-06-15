import type { Rule } from "../types";
import { getAddedLines, getFilePath, getRemovedLines } from "../diff-parser";

const AUTH_PATH_RE = /(^|\/)(auth|middleware|guard|guards|permission|permissions|rbac|session|jwt|routes?)\b|route|middleware/i;
const AUTH_REMOVAL_RE = /\b(requireAuth|authorize|isAdmin|isOwner|verifyToken|verifyJwt|checkRole|hasRole|requireRole|session|jwt|permission|role)\b/;
const NEGATED_ACCESS_RE = /\b(if|return)\b.*(!user|!session|!token|unauthorized|forbidden|403|401)/i;

export const authRegressionRule: Rule = {
  id: "auth-regression",
  meta: {
    category: "auth",
    defaultSeverity: "warn",
    maturity: "beta",
    description: "Detects high-confidence auth guard removals in auth-sensitive files.",
    remediation: "Confirm equivalent auth checks still run before merging."
  },
  run(context) {
    const findings = [];

    for (const file of context.files) {
      const filePath = getFilePath(file);
      if (!AUTH_PATH_RE.test(filePath)) {
        continue;
      }

      const removed = getRemovedLines(file);
      const added = getAddedLines(file).map((line) => line.content).join("\n");
      const removedAuth = removed.find((line) => AUTH_REMOVAL_RE.test(line.content) || NEGATED_ACCESS_RE.test(line.content));
      if (!removedAuth) {
        continue;
      }

      if (AUTH_REMOVAL_RE.test(added) || NEGATED_ACCESS_RE.test(added)) {
        continue;
      }

      findings.push({
        ruleId: "auth-regression",
        category: "auth" as const,
        severity: "warn" as const,
        message: "Auth-sensitive check removed without an obvious replacement in this diff.",
        filePath,
        line: removedAuth.oldLineNumber,
        excerpt: removedAuth.content.trim(),
        remediation: "Add replacement coverage or explain where the auth guard moved."
      });
    }

    return findings;
  }
};
