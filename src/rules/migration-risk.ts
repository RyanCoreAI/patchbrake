import type { Rule } from "../types";
import { getAddedLines, getFilePath } from "../diff-parser";
import { isMigrationPath } from "../path-utils";

const DANGEROUS_SQL: Array<{ label: string; pattern: RegExp; severity: "warn" | "error" }> = [
  { label: "DROP TABLE", pattern: /\bDROP\s+TABLE\b/i, severity: "error" },
  { label: "DROP DATABASE", pattern: /\bDROP\s+DATABASE\b/i, severity: "error" },
  { label: "TRUNCATE", pattern: /\bTRUNCATE\b/i, severity: "error" },
  { label: "ALTER TABLE DROP", pattern: /\bALTER\s+TABLE\b.*\bDROP\b/i, severity: "warn" },
  { label: "DELETE without WHERE", pattern: /\bDELETE\s+FROM\b(?!.*\bWHERE\b)/i, severity: "error" }
];

export const migrationRiskRule: Rule = {
  id: "migration-risk",
  meta: {
    category: "migration",
    defaultSeverity: "warn",
    description: "Detects destructive database migration statements added in the diff.",
    remediation: "Add a reversible migration plan, backup/rollback notes, and an explicit data safety review."
  },
  run(context) {
    const findings = [];

    for (const file of context.files) {
      const filePath = getFilePath(file);
      if (!isMigrationPath(filePath)) {
        continue;
      }

      for (const line of getAddedLines(file)) {
        const content = line.content.trim();
        const match = DANGEROUS_SQL.find((entry) => entry.pattern.test(content));
        if (!match) {
          continue;
        }

        findings.push({
          ruleId: "migration-risk",
          category: "migration" as const,
          severity: match.severity,
          message: `Destructive migration statement added: ${match.label}.`,
          filePath,
          line: line.newLineNumber,
          excerpt: content,
          remediation: "Require an explicit migration review, rollback path, and data backup plan before merging."
        });
      }
    }

    return findings;
  }
};
