import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";
import { parseDiff } from "../src/diff-parser";
import { runRules } from "../src/rule-engine";
import { builtinRules } from "../src/rules";
import type { ResolvedConfig } from "../src/types";

function scanFixture(relativePath: string, configOverride?: Partial<ResolvedConfig>) {
  const diff = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
  const files = parseDiff(diff);
  const config = { ...loadConfig(process.cwd()), ...configOverride };
  return runRules(files, builtinRules, config, {
    cwd: process.cwd(),
    staged: true,
    format: "text",
    failOn: "error"
  });
}

function scanWorkflowLine(content: string) {
  const diff = `diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -1,2 +1,3 @@
 name: ci
 permissions:
+  ${content}
`;
  const files = parseDiff(diff);
  return runRules(files, builtinRules, loadConfig(process.cwd()), {
    cwd: process.cwd(),
    staged: true,
    format: "text",
    failOn: "error"
  });
}

describe("builtin rules", () => {
  it("detects secret leaks", () => {
    const result = scanFixture("fixtures/secret-leak/bad.diff");
    expect(result.findings.map((finding) => finding.ruleId)).toContain("secret-leak");
  });

  it("does not flag placeholder secrets", () => {
    const result = scanFixture("fixtures/secret-leak/safe.diff");
    expect(result.findings.map((finding) => finding.ruleId)).not.toContain("secret-leak");
  });

  it("detects deleted tests", () => {
    const result = scanFixture("fixtures/deleted-tests/bad.diff");
    expect(result.findings.map((finding) => finding.ruleId)).toContain("deleted-tests");
  });

  it("detects risky workflow permissions", () => {
    const result = scanFixture("fixtures/workflow-permissions/bad.diff");
    expect(result.findings.map((finding) => finding.ruleId)).toContain("workflow-permissions");
  });

  it("detects expanded GitHub token write permissions", () => {
    for (const permission of ["issues", "pages", "statuses", "attestations", "artifact-metadata", "code-quality", "discussions"]) {
      const result = scanWorkflowLine(`${permission}: write`);
      expect(result.findings.map((finding) => finding.ruleId)).toContain("workflow-permissions");
    }
  });

  it("does not flag read-only workflow permissions", () => {
    for (const permission of ["contents: read", "models: read", "vulnerability-alerts: read", "permissions: read-all"]) {
      const result = scanWorkflowLine(permission);
      expect(result.findings.map((finding) => finding.ruleId)).not.toContain("workflow-permissions");
    }
  });

  it("explains OIDC risk for id-token write", () => {
    const result = scanWorkflowLine("id-token: write");
    const finding = result.findings.find((candidate) => candidate.ruleId === "workflow-permissions");

    expect(finding?.message).toContain("OIDC");
  });

  it("detects migration risk", () => {
    const result = scanFixture("fixtures/migration-risk/bad.diff");
    expect(result.findings.map((finding) => finding.ruleId)).toContain("migration-risk");
  });

  it("detects prompt config drift", () => {
    const result = scanFixture("fixtures/prompt-config-drift/bad.diff");
    expect(result.findings.map((finding) => finding.ruleId)).toContain("prompt-config-drift");
  });

  it("honors rule severity overrides", () => {
    const result = scanFixture("fixtures/workflow-permissions/bad.diff", {
      rules: {
        "workflow-permissions": "info"
      }
    });

    expect(result.findings.every((finding) => finding.severity === "info")).toBe(true);
  });

  it("honors exclude patterns", () => {
    const result = scanFixture("fixtures/secret-leak/bad.diff", {
      exclude: ["src/**"]
    });

    expect(result.files).toHaveLength(0);
    expect(result.findings).toHaveLength(0);
  });
});
