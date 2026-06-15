import type { Rule } from "../types";
import { getFilePath, getRemovedLines } from "../diff-parser";
import { isProbablyTestPath } from "../path-utils";

const TEST_CALL_RE = /\b(?:describe|it|test|expect)\s*\(/;

export const deletedTestsRule: Rule = {
  id: "deleted-tests",
  meta: {
    category: "tests",
    defaultSeverity: "error",
    description: "Detects deleted test files or removed test cases/assertions.",
    remediation: "Keep coverage for the changed behavior or explain why the test is obsolete."
  },
  run(context) {
    const findings = [];

    for (const file of context.files) {
      const filePath = getFilePath(file);
      const removedLines = getRemovedLines(file);

      if (file.status === "deleted" && isProbablyTestPath(filePath)) {
        findings.push({
          ruleId: "deleted-tests",
          category: "tests" as const,
          severity: "error" as const,
          message: "Test file deleted in this diff.",
          filePath,
          remediation: "Keep the test or add replacement coverage in the same change."
        });
        continue;
      }

      if (!isProbablyTestPath(filePath)) {
        continue;
      }

      const removedTestCalls = removedLines.filter((line) => TEST_CALL_RE.test(line.content));
      if (removedTestCalls.length === 0) {
        continue;
      }

      findings.push({
        ruleId: "deleted-tests",
        category: "tests" as const,
        severity: "error" as const,
        message: `${removedTestCalls.length} test case or assertion line(s) removed.`,
        filePath,
        line: removedTestCalls[0]?.oldLineNumber,
        excerpt: removedTestCalls[0]?.content.trim(),
        remediation: "Confirm the deleted coverage is replaced or intentionally obsolete."
      });
    }

    return findings;
  }
};
