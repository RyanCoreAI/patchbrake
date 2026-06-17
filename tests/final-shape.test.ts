import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { runBenchmark } from "../src/commands/benchmark";
import { runScan } from "../src/commands/scan";
import { loadConfig } from "../src/config";
import { parseDiff } from "../src/diff-parser";
import { formatJsonReport } from "../src/reporters/json";
import { formatTextReport } from "../src/reporters/text";
import { runRules, shouldFail } from "../src/rule-engine";
import { builtinRules } from "../src/rules";

function makeRepo() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "patchbrake-final-"));
  spawnSync("git", ["init"], { cwd, encoding: "utf8" });
  spawnSync("git", ["config", "user.email", "test@example.com"], { cwd, encoding: "utf8" });
  spawnSync("git", ["config", "user.name", "PatchBrake Test"], { cwd, encoding: "utf8" });
  return cwd;
}

describe("final-shape capabilities", () => {
  it("suppresses baseline findings and ignores them for exit code", () => {
    const cwd = makeRepo();
    fs.mkdirSync(path.join(cwd, "src"));
    fs.writeFileSync(path.join(cwd, "src/config.ts"), 'export const token = "ghp_1234567890abcdefghijklmnop";\n');
    spawnSync("git", ["add", "."], { cwd, encoding: "utf8" });

    const first = runScan({ cwd, staged: true, ignoreBaseline: true, failOn: "error" });
    fs.writeFileSync(
      path.join(cwd, ".patchbrake-baseline.json"),
      JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), findings: [{ fingerprint: first.result.findings[0]?.fingerprint }] })
    );

    const second = runScan({ cwd, staged: true, failOn: "error" });

    expect(second.result.findings[0]?.suppressed?.kind).toBe("baseline");
    expect(second.exitCode).toBe(0);
  });

  it("suppresses findings from config ignore entries", () => {
    const diff = "diff --git a/src/config.ts b/src/config.ts\n--- a/src/config.ts\n+++ b/src/config.ts\n@@ -1,1 +1,2 @@\n export const ok = true;\n+export const token = \"ghp_1234567890abcdefghijklmnop\";\n";
    const first = runRules(parseDiff(diff), builtinRules, loadConfig(process.cwd()), {
      cwd: process.cwd(),
      staged: true,
      format: "json",
      failOn: "error",
      ignoreBaseline: true
    });
    const ignored = runRules(parseDiff(diff), builtinRules, { ...loadConfig(process.cwd()), ignore: [first.findings[0]!.fingerprint] }, {
      cwd: process.cwd(),
      staged: true,
      format: "json",
      failOn: "error",
      ignoreBaseline: true
    });

    expect(ignored.findings[0]?.suppressed?.kind).toBe("config");
    expect(shouldFail(ignored.findings, "error")).toBe(false);
  });

  it("supports inline ignore comments", () => {
    const diff = "diff --git a/src/config.ts b/src/config.ts\n--- a/src/config.ts\n+++ b/src/config.ts\n@@ -1,1 +1,2 @@\n export const ok = true;\n+export const token = \"ghp_1234567890abcdefghijklmnop\"; // patchbrake-ignore secret-leak\n";
    const result = runRules(parseDiff(diff), builtinRules, loadConfig(process.cwd()), {
      cwd: process.cwd(),
      staged: true,
      format: "json",
      failOn: "error",
      ignoreBaseline: true
    });

    expect(result.findings[0]?.suppressed?.kind).toBe("inline");
  });

  it("can disable inline ignore suppression for CI", () => {
    const diff = "diff --git a/src/config.ts b/src/config.ts\n--- a/src/config.ts\n+++ b/src/config.ts\n@@ -1,1 +1,2 @@\n export const ok = true;\n+export const token = \"ghp_1234567890abcdefghijklmnop\"; // patchbrake-ignore secret-leak\n";
    const result = runRules(parseDiff(diff), builtinRules, loadConfig(process.cwd()), {
      cwd: process.cwd(),
      staged: true,
      format: "json",
      failOn: "error",
      ignoreBaseline: true,
      disallowInlineIgnore: true
    });

    const secretFinding = result.findings.find((finding) => finding.ruleId === "secret-leak");
    expect(secretFinding?.suppressed).toBeUndefined();
    expect(result.findings.map((finding) => finding.ruleId)).toContain("inline-ignore");
  });

  it("fails when a diff adds a patchbrake ignore comment in strict CI mode", () => {
    const diff = "diff --git a/src/config.ts b/src/config.ts\n--- a/src/config.ts\n+++ b/src/config.ts\n@@ -1,1 +1,2 @@\n export const ok = true;\n+// patchbrake-ignore-file secret-leak\n";
    const result = runRules(parseDiff(diff), builtinRules, loadConfig(process.cwd()), {
      cwd: process.cwd(),
      staged: true,
      format: "json",
      failOn: "error",
      ignoreBaseline: true,
      failOnNewIgnore: true
    });

    expect(result.findings[0]?.ruleId).toBe("inline-ignore");
    expect(result.findings[0]?.severity).toBe("error");
    expect(shouldFail(result.findings, "error")).toBe(true);
  });

  it("fail-on-new-ignore blocks even when fail-on is never", () => {
    const cwd = makeRepo();
    fs.mkdirSync(path.join(cwd, "src"));
    fs.writeFileSync(path.join(cwd, "src/config.ts"), "// patchbrake-ignore-file secret-leak\n");
    spawnSync("git", ["add", "."], { cwd, encoding: "utf8" });

    const result = runScan({ cwd, staged: true, failOn: "never", failOnNewIgnore: true });

    expect(result.result.findings.map((finding) => finding.ruleId)).toContain("inline-ignore");
    expect(result.exitCode).toBe(1);
  });

  it("loads a local custom rule", () => {
    const cwd = makeRepo();
    fs.writeFileSync(
      path.join(cwd, "custom-rule.cjs"),
      `module.exports = {
        id: "custom-todo",
        meta: { category: "unknown", defaultSeverity: "warn", description: "todo", remediation: "remove todo" },
        run(context) {
          return context.files.flatMap(file => file.hunks.flatMap(hunk => hunk.lines.filter(line => line.type === "add" && line.content.includes("TODO")).map(line => ({
            ruleId: "custom-todo",
            category: "unknown",
            severity: "warn",
            message: "TODO added",
            filePath: file.newPath,
            line: line.newLineNumber
          }))));
        }
      };`
    );
    fs.writeFileSync(path.join(cwd, ".patchbrakerc.json"), JSON.stringify({ customRules: ["./custom-rule.cjs"] }));
    fs.writeFileSync(path.join(cwd, "notes.md"), "TODO: follow up\n");
    spawnSync("git", ["add", "."], { cwd, encoding: "utf8" });

    const result = runScan({ cwd, staged: true, failOn: "never" });

    expect(result.result.findings.map((finding) => finding.ruleId)).toContain("custom-todo");
  });

  it("can disable local custom rules", () => {
    const cwd = makeRepo();
    fs.writeFileSync(
      path.join(cwd, "custom-rule.cjs"),
      `module.exports = {
        id: "custom-todo",
        meta: { category: "unknown", defaultSeverity: "warn", description: "todo", remediation: "remove todo" },
        run() {
          return [{ ruleId: "custom-todo", category: "unknown", severity: "warn", message: "TODO added", filePath: "notes.md" }];
        }
      };`
    );
    fs.writeFileSync(path.join(cwd, ".patchbrakerc.json"), JSON.stringify({ customRules: ["./custom-rule.cjs"] }));
    fs.writeFileSync(path.join(cwd, "notes.md"), "TODO: follow up\n");
    spawnSync("git", ["add", "."], { cwd, encoding: "utf8" });

    const result = runScan({ cwd, staged: true, failOn: "never", noCustomRules: true });

    expect(result.result.findings.map((finding) => finding.ruleId)).not.toContain("custom-todo");
  });

  it("applies built-in shareable configs", () => {
    const config = loadConfigWithContent({ extends: ["patchbrake-config-github-actions"] });

    expect(config.rules["workflow-permissions"]).toBe("error");
    expect(config.rules["dangerous-shell"]).toBe("warn");
  });

  it("skips files over maxFileSizeBytes", () => {
    const diff = "diff --git a/src/big.ts b/src/big.ts\n--- a/src/big.ts\n+++ b/src/big.ts\n@@ -1,1 +1,2 @@\n export const ok = true;\n+export const token = \"ghp_1234567890abcdefghijklmnop\";\n";
    const result = runRules(parseDiff(diff), builtinRules, { ...loadConfig(process.cwd()), maxFileSizeBytes: 1 }, {
      cwd: process.cwd(),
      staged: true,
      format: "json",
      failOn: "error",
      ignoreBaseline: true
    });

    expect(result.files).toHaveLength(0);
    expect(result.skippedFiles[0]?.reason).toBe("too-large");
  });

  it("only reports rule timings when reportTimings is enabled", () => {
    const diff = "diff --git a/src/config.ts b/src/config.ts\n--- a/src/config.ts\n+++ b/src/config.ts\n@@ -1,1 +1,2 @@\n export const ok = true;\n+export const token = \"ghp_1234567890abcdefghijklmnop\";\n";
    const withoutTimings = runRules(parseDiff(diff), builtinRules, loadConfig(process.cwd()), {
      cwd: process.cwd(),
      staged: true,
      format: "json",
      failOn: "error",
      ignoreBaseline: true
    });
    const withTimings = runRules(parseDiff(diff), builtinRules, { ...loadConfig(process.cwd()), reportTimings: true }, {
      cwd: process.cwd(),
      staged: true,
      format: "json",
      failOn: "error",
      ignoreBaseline: true
    });

    expect(formatTextReport(withoutTimings)).not.toContain("Rule timing:");
    expect(JSON.parse(formatJsonReport(withoutTimings))).not.toHaveProperty("ruleTimings");
    expect(formatTextReport(withTimings)).toContain("Rule timing:");
    expect(JSON.parse(formatJsonReport(withTimings))).toHaveProperty("ruleTimings");
  });

  it("runs the public benchmark suite", () => {
    const result = runBenchmark(process.cwd());

    expect(result.failed).toBe(0);
    expect(result.total).toBe(30);
  });
});

function loadConfigWithContent(content: unknown) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "patchbrake-config-"));
  fs.writeFileSync(path.join(cwd, ".patchbrakerc.json"), JSON.stringify(content));
  return loadConfig(cwd);
}
