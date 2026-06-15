import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { runScan } from "../src/commands/scan";

describe("scan command", () => {
  it("scans staged changes in a real git repo", () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "patchbrake-"));
    spawnSync("git", ["init"], { cwd, encoding: "utf8" });
    fs.mkdirSync(path.join(cwd, "src"));
    fs.writeFileSync(path.join(cwd, "src/config.ts"), 'export const token = "ghp_1234567890abcdefghijklmnop";\n');
    spawnSync("git", ["add", "."], { cwd, encoding: "utf8" });

    const { result, exitCode, output } = runScan({ cwd, staged: true });

    expect(exitCode).toBe(1);
    expect(output).toContain("secret-leak");
    expect(result.findings[0]?.ruleId).toBe("secret-leak");
  });

  it("can emit JSON for multiple staged risk categories", () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "patchbrake-"));
    spawnSync("git", ["init"], { cwd, encoding: "utf8" });
    spawnSync("git", ["config", "user.email", "test@example.com"], { cwd, encoding: "utf8" });
    spawnSync("git", ["config", "user.name", "PatchBrake Test"], { cwd, encoding: "utf8" });

    fs.mkdirSync(path.join(cwd, ".github/workflows"), { recursive: true });
    fs.mkdirSync(path.join(cwd, "tests"), { recursive: true });
    fs.mkdirSync(path.join(cwd, "src"), { recursive: true });
    fs.writeFileSync(path.join(cwd, "tests/auth.test.ts"), 'it("rejects anonymous users", () => {});\n');
    fs.writeFileSync(path.join(cwd, "src/config.ts"), "export const region = 'us-east-1';\n");
    spawnSync("git", ["add", "."], { cwd, encoding: "utf8" });
    spawnSync("git", ["commit", "-m", "initial"], { cwd, encoding: "utf8" });

    fs.writeFileSync(path.join(cwd, "tests/auth.test.ts"), "");
    fs.writeFileSync(
      path.join(cwd, ".github/workflows/release.yml"),
      "name: Release\non:\n  pull_request_target:\npermissions:\n  contents: write\n"
    );
    fs.writeFileSync(path.join(cwd, "src/config.ts"), 'export const token = "ghp_1234567890abcdefghijklmnop";\n');
    spawnSync("git", ["add", "."], { cwd, encoding: "utf8" });

    const { output, exitCode } = runScan({ cwd, staged: true, format: "json", failOn: "error" });
    const parsed = JSON.parse(output);

    expect(exitCode).toBe(1);
    expect(parsed.findings.map((finding: { ruleId: string }) => finding.ruleId)).toEqual(
      expect.arrayContaining(["secret-leak", "deleted-tests", "workflow-permissions"])
    );
  });
});
