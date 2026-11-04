import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";
import { parseDiff, getFilePath } from "../src/diff-parser";
import { runRules } from "../src/rule-engine";
import { builtinRules } from "../src/rules";
import { matchesAnyGlob } from "../src/path-utils";
import { formatJsonReport } from "../src/reporters/json";
import { formatTextReport } from "../src/reporters/text";
import { formatSarifReport } from "../src/reporters/sarif";

const syntheticToken = "ghp_" + "a".repeat(36);
function scan(filePath: string, line: string, include: string[] = []) {
  const files = parseDiff(`diff --git a/${filePath} b/${filePath}\n--- a/${filePath}\n+++ b/${filePath}\n@@ -0,0 +1 @@\n+${line}\n`);
  return runRules(files, builtinRules, { ...loadConfig(process.cwd()), include }, {
    cwd: process.cwd(), staged: true, format: "json", failOn: "error", disallowInlineIgnore: true
  });
}

describe("deep audit security regressions", () => {
  it("scans root files selected with a globstar include", () => {
    expect(scan("index.ts", `const token = "${syntheticToken}"`, ["**/*.ts"]).findings.some(f => f.ruleId === "secret-leak")).toBe(true);
    expect(matchesAnyGlob("src/index.ts", ["src/**/*.ts"])).toBe(true);
  });
  it("does not let question marks match path separators", () => {
    expect(matchesAnyGlob("src/a/index.ts", ["src?a/index.ts"])).toBe(false);
  });
  it("preserves real a and b root directory names after diff parsing", () => {
    const result = scan("a/b/config.ts", `const token = "${syntheticToken}"`, ["a/b/**"]);
    expect(result.files.map(getFilePath)).toEqual(["a/b/config.ts"]);
    expect(result.findings.some(f => f.ruleId === "secret-leak")).toBe(true);
    expect(matchesAnyGlob("a/src/config.ts", ["src/**"])).toBe(false);
  });
  it.each(["example", "sample", "dummy", "..."])("detects tokens beside unrelated placeholder text %s", comment => {
    const result = scan("src/config.ts", `const token = "${syntheticToken}"; // ${comment}`);
    expect(result.findings.some(f => f.ruleId === "secret-leak")).toBe(true);
  });
  it("detects quoted JSON secret assignments", () => {
    expect(scan("config.json", '"password": "synthetic-private-value"').findings.some(f => f.ruleId === "secret-leak")).toBe(true);
  });
  it("detects high-confidence tokens in comments", () => {
    expect(scan("config.py", `# token = "${syntheticToken}"`).findings.some(f => f.ruleId === "secret-leak")).toBe(true);
  });
  it("redacts complete escaped quoted assignment values", () => {
    const result = scan("migration.sql", 'DROP TABLE users; -- password="synthetic\\"private-tail-value"');
    expect(formatJsonReport(result)).not.toContain("private-tail-value");
  });
  it.each([formatJsonReport, formatTextReport, formatSarifReport])("redacts secrets in every rule's report excerpt", format => {
    const result = scan("migration.sql", `DROP TABLE users; -- token="${syntheticToken}"`);
    expect(result.findings.some(f => f.ruleId === "migration-risk")).toBe(true);
    expect(format(result)).not.toContain(syntheticToken);
  });
  it("redacts secret excerpts from inline-ignore findings", () => {
    const result = scan("src/config.ts", `const token = "${syntheticToken}"; // patchbrake-ignore`);
    expect(result.findings.some(f => f.ruleId === "inline-ignore")).toBe(true);
    expect(formatJsonReport(result)).not.toContain(syntheticToken);
  });
});
