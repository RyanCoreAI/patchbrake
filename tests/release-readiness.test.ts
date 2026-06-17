import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";
import { parseDiff } from "../src/diff-parser";
import { formatJsonReport } from "../src/reporters/json";
import { formatSarifReport } from "../src/reporters/sarif";
import { formatTextReport } from "../src/reporters/text";
import { runRules } from "../src/rule-engine";
import { builtinRules } from "../src/rules";

function scanDiff(diff: string) {
  return runRules(parseDiff(diff), builtinRules, loadConfig(process.cwd()), {
    cwd: process.cwd(),
    staged: true,
    format: "json",
    failOn: "error",
    ignoreBaseline: true
  });
}

describe("release readiness", () => {
  it("redacts bare tokens in every reporter", () => {
    const secretValues = [
      "sk-real1234567890abcdefghijklmnop",
      "ghp_1234567890abcdefghijklmnop",
      "github_pat_1234567890abcdefghijklmnop",
      "AKIA1234567890ABCDEF"
    ];
    const diff = `diff --git a/src/config.ts b/src/config.ts
--- a/src/config.ts
+++ b/src/config.ts
@@ -1,1 +1,5 @@
 export const ok = true;
+${secretValues[0]}
+${secretValues[1]}
+${secretValues[2]}
+${secretValues[3]}
`;
    const result = scanDiff(diff);
    const reports = [formatTextReport(result), formatJsonReport(result), formatSarifReport(result)];

    expect(result.findings).toHaveLength(4);
    for (const report of reports) {
      for (const secret of secretValues) {
        expect(report).not.toContain(secret);
      }
      expect(report).toContain("redacted");
    }
  });

  it("uses nuanced deleted-tests severity", () => {
    const deletedFile = scanDiff(`diff --git a/tests/auth.test.ts b/tests/auth.test.ts
deleted file mode 100644
--- a/tests/auth.test.ts
+++ /dev/null
@@ -1,1 +0,0 @@
-it("rejects anonymous users", () => {});
`);
    const removedCall = scanDiff(`diff --git a/tests/auth.test.ts b/tests/auth.test.ts
--- a/tests/auth.test.ts
+++ b/tests/auth.test.ts
@@ -1,3 +1,2 @@
 describe("auth", () => {
-  it("rejects anonymous users", () => {});
 });
`);
    const replacedCall = scanDiff(`diff --git a/tests/auth.test.ts b/tests/auth.test.ts
--- a/tests/auth.test.ts
+++ b/tests/auth.test.ts
@@ -1,3 +1,3 @@
 describe("auth", () => {
-  it("rejects anonymous users", () => {});
+  it("rejects anonymous sessions", () => {});
 });
`);

    expect(deletedFile.findings[0]?.severity).toBe("error");
    expect(removedCall.findings[0]?.severity).toBe("warn");
    expect(replacedCall.findings[0]?.severity).toBe("info");
  });

  it("keeps public release docs current", () => {
    const readme = fs.readFileSync(path.join(process.cwd(), "README.md"), "utf8");
    const changelog = fs.readFileSync(path.join(process.cwd(), "CHANGELOG.md"), "utf8");
    const implementationStatus = fs.readFileSync(path.join(process.cwd(), "docs/implementation-status.md"), "utf8");
    const action = fs.readFileSync(path.join(process.cwd(), "action.yml"), "utf8");
    const cliSource = fs.readFileSync(path.join(process.cwd(), "src/cli.ts"), "utf8");
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as { author?: string };

    expect(readme).not.toContain("Implemented locally");
    expect(readme).not.toContain("npm package is not published yet");
    expect(readme).not.toContain("npm link");
    expect(readme).toContain("[简体中文](README.zh-CN.md)");
    expect(readme).toContain("npx patchbrake scan --staged");
    expect(readme).toContain("![PatchBrake demo](assets/demo.gif)");
    expect(readme).toContain("RyanCoreAI/patchbrake@v0.2.0");
    expect(readme).toContain("img.shields.io/npm/v/patchbrake.svg");
    expect(readme).toContain("version: \"0.2.0\"");
    expect(implementationStatus).not.toContain("blocked on push");
    expect(implementationStatus).toContain("complete for the current public release");
    expect(changelog).toContain("SARIF");
    expect(changelog).toContain("baseline");
    expect(changelog).toContain("benchmark");
    expect(changelog).toContain("beta rules");
    expect(action).toContain("text, json, or sarif");
    expect(action).toContain('default: "0.2.0"');
    expect(action).not.toContain("default: latest");
    expect(action).toContain("--ignore-scripts");
    expect(action).toContain("allow-custom-rules:");
    expect(action).toContain('default: "false"');
    expect(action).toContain("allow-inline-ignore:");
    expect(action).toContain("fail-on-new-ignore:");
    expect(action).toContain('default: "true"');
    expect(action).toContain("--no-custom-rules");
    expect(action).toContain("--disallow-inline-ignore");
    expect(action).toContain("--fail-on-new-ignore");
    expect(cliSource).toContain("readPackageVersion()");
    expect(cliSource).not.toMatch(/\.version\("0\./);
    expect(packageJson.author).toBe("PatchBrake contributors");
  });
});
