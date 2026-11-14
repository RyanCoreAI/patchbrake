import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { parseDiff } from "../src/diff-parser";
import { loadConfig } from "../src/config";
import { runRules } from "../src/rule-engine";
import { builtinRules } from "../src/rules";
import { runScan } from "../src/commands/scan";

const token = "ghp_" + "z".repeat(36);
const ignoreMarker = ["patchbrake", "ignore"].join("-");
function scan(lines: string[]) {
  const oldCount = lines.filter(line => !line.startsWith("+")).length;
  const newCount = lines.filter(line => !line.startsWith("-")).length;
  const files = parseDiff([
    "diff --git a/src/config.ts b/src/config.ts",
    "--- a/src/config.ts", "+++ b/src/config.ts", `@@ -1,${oldCount} +1,${newCount} @@`, ...lines, ""
  ].join("\n"));
  return runRules(files, builtinRules, loadConfig(process.cwd()), {
    cwd: process.cwd(), staged: true, format: "json", failOn: "error"
  });
}

describe("second audit diff and suppression boundaries", () => {
  it("treats header-shaped added and removed text as hunk data", () => {
    const result = scan(["--- old text", `+++ token = \"${token}\"`, "+const ok = true;"]);
    expect(result.files[0].oldPath).toBe("src/config.ts");
    expect(result.files[0].newPath).toBe("src/config.ts");
    expect(result.files[0].hunks[0].lines[0].type).toBe("remove");
    expect(result.findings.some(f => f.ruleId === "secret-leak" && f.line === 1)).toBe(true);
  });
  it("does not retain removed file-wide ignore directives", () => {
    const result = scan([`-// ${ignoreMarker}-file secret-leak`, `+const token = \"${token}\";`]);
    expect(result.findings.find(f => f.ruleId === "secret-leak")?.suppressed).toBeUndefined();
  });
  it.each(["", "-next-line", "-file"])("does not widen a rule-specific %s ignore to all rules", suffix => {
    const lines = suffix ? [`+// ${ignoreMarker}${suffix} migration-risk`, `+const token = \"${token}\";`]
      : [`+const token = \"${token}\"; // ${ignoreMarker} migration-risk`];
    expect(scan(lines).findings.find(f => f.ruleId === "secret-leak")?.suppressed).toBeUndefined();
  });
  it.each(["", "-next-line", "-file"])("still honors the exact matching %s ignore", suffix => {
    const lines = suffix ? [`+// ${ignoreMarker}${suffix} secret-leak`, `+const token = \"${token}\";`]
      : [`+const token = \"${token}\"; // ${ignoreMarker} secret-leak`];
    expect(scan(lines).findings.find(f => f.ruleId === "secret-leak")?.suppressed?.kind).toBe("inline");
  });
  it.each(["custom.rule", "custom:rule", "secret-leak-extra"])("does not treat unknown rule %s as a bare all-rules directive", rule => {
    expect(scan([`+const token = \"${token}\"; // ${ignoreMarker} ${rule}`])
      .findings.find(f => f.ruleId === "secret-leak")?.suppressed).toBeUndefined();
  });
  it.each([
    ["color.ui", "always"], ["diff.noprefix", "true"], ["diff.mnemonicPrefix", "true"],
    ["diff.srcPrefix", "before/"], ["diff.dstPrefix", "after/"],
    ["diff.outputIndicatorNew", ">"]
  ])("scans staged workflow changes regardless of %s", (key, value) => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "patchbrake-format-"));
    const git = (...args: string[]) => {
      const r = spawnSync("git", args, { cwd, encoding: "utf8", windowsHide: true });
      expect(r.status, r.stderr).toBe(0);
      return r.stdout;
    };
    git("init");
    git("config", key, value);
    fs.mkdirSync(path.join(cwd, ".github/workflows"), { recursive: true });
    fs.writeFileSync(path.join(cwd, ".github/workflows/check.yml"), "permissions: write-all\n");
    git("add", "--", ".github/workflows/check.yml");
    const result = runScan({ cwd, staged: true, failOn: "warn" });
    expect(result.result.files[0]?.newPath).toBe(".github/workflows/check.yml");
    expect(result.result.findings.some(f => f.ruleId === "workflow-permissions")).toBe(true);
    expect(result.exitCode).toBe(1);
  });
});
