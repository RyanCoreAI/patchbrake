import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { parseDiff } from "../src/diff-parser";
import { loadConfig } from "../src/config";
import { runRules } from "../src/rule-engine";
import { builtinRules } from "../src/rules";

describe("parseDiff", () => {
  it("parses files, hunks, and added lines", () => {
    const diff = fs.readFileSync(path.join(process.cwd(), "fixtures/secret-leak/bad.diff"), "utf8");
    const files = parseDiff(diff);

    expect(files).toHaveLength(1);
    expect(files[0]?.newPath).toBe("src/config.ts");
    expect(files[0]?.hunks).toHaveLength(1);
    expect(files[0]?.hunks[0]?.lines.some((line) => line.type === "add" && line.newLineNumber === 3)).toBe(true);
  });

  it("decodes real Git UTF-8 octal-quoted workflow paths before applying rules", () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "patchbrake-quoted-"));
    try {
      spawnSync("git", ["init"], { cwd, encoding: "utf8" });
      fs.mkdirSync(path.join(cwd, ".github/workflows"), { recursive: true });
      const filename = ".github/workflows/安全 workflow.yml";
      fs.writeFileSync(path.join(cwd, filename), "on:\n  pull_request_target:\n");
      spawnSync("git", ["add", "--", filename], { cwd, encoding: "utf8" });
      const diff = spawnSync("git", ["-c", "core.quotePath=true", "diff", "--cached"], { cwd, encoding: "utf8" });
      expect(diff.status).toBe(0);
      expect(diff.stdout).toContain("\\345");
      const files = parseDiff(diff.stdout);
      expect(files[0].newPath).toBe(filename);
      const result = runRules(files, builtinRules, loadConfig(cwd), { cwd, staged: true, format: "json", failOn: "error" });
      expect(result.findings.map(finding => finding.ruleId)).toContain("workflow-permissions");
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("roundtrips C-quoted paths including UTF-8, control characters and literal backslashes", () => {
    const filenames = ["src/安全.ts", "src/tab\tname.ts", 'src/quote"name.ts', "src/back\\slash.ts", "src/emoji😀.ts", "a/real-directory.ts"];
    function quote(value: string) {
      return '"' + [...Buffer.from(value, "utf8")].map(byte =>
        byte < 32 || byte >= 127 || byte === 34 || byte === 92 ? "\\" + byte.toString(8).padStart(3, "0") : String.fromCharCode(byte)
      ).join("") + '"';
    }
    for (const filename of filenames) {
      const a = quote("a/" + filename), b = quote("b/" + filename);
      const diff = `diff --git ${a} ${b}\n--- ${a}\n+++ ${b}\n@@ -1 +1 @@\n-old\n+new\n`;
      expect(parseDiff(diff)[0].oldPath).toBe(filename);
      expect(parseDiff(diff)[0].newPath).toBe(filename);
      // Binary/rename-only headers have no ---/+++ path to repair a bad header.
      expect(parseDiff(`diff --git ${a} ${b}\nBinary files ${a} and ${b} differ\n`)[0].newPath).toBe(filename);
    }
  });
});
