import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";

function loadConfigWithContent(content: unknown) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "patchbrake-config-validation-"));
  fs.writeFileSync(path.join(cwd, ".patchbrakerc.json"), JSON.stringify(content));
  return loadConfig(cwd);
}

describe("runtime config validation", () => {
  it("rejects invalid rule severity values", () => {
    expect(() => loadConfigWithContent({ rules: { "secret-leak": "critical" } })).toThrow(/rules\.secret-leak.*off, info, warn, or error/);
  });

  it("rejects invalid failOn values", () => {
    expect(() => loadConfigWithContent({ failOn: "errors" })).toThrow(/failOn.*warn, error, or never/);
  });

  it("rejects invalid outputFormat values", () => {
    expect(() => loadConfigWithContent({ outputFormat: "xml" })).toThrow(/outputFormat.*text, json, or sarif/);
  });

  it("rejects non-string arrays for path-like fields", () => {
    for (const field of ["include", "exclude", "customRules", "extends"]) {
      expect(() => loadConfigWithContent({ [field]: ["src/**", 123] })).toThrow(new RegExp(`${field}.*array of strings`));
    }
  });

  it("rejects invalid maxFileSizeBytes values", () => {
    expect(() => loadConfigWithContent({ maxFileSizeBytes: 0 })).toThrow(/maxFileSizeBytes.*positive integer/);
    expect(() => loadConfigWithContent({ maxFileSizeBytes: 10.5 })).toThrow(/maxFileSizeBytes.*positive integer/);
  });

  it("rejects overrides without a string files array", () => {
    expect(() => loadConfigWithContent({ overrides: [{ rules: { "secret-leak": "off" } }] })).toThrow(/overrides\[0\]\.files.*required/);
    expect(() => loadConfigWithContent({ overrides: [{ files: "src/**" }] })).toThrow(/overrides\[0\]\.files.*array of strings/);
  });

  it("rejects unknown top-level fields", () => {
    expect(() => loadConfigWithContent({ fail_on: "warn" })).toThrow(/fail_on.*not a supported field/);
  });

  it("accepts valid local config, shareable configs, and overrides", () => {
    const config = loadConfigWithContent({
      extends: ["patchbrake-config-github-actions"],
      rules: {
        "secret-leak": { severity: "error", enabled: true }
      },
      include: ["src/**"],
      exclude: ["dist/**"],
      customRules: ["./custom-rule.cjs"],
      maxFileSizeBytes: 1000,
      failOn: "warn",
      outputFormat: "json",
      reportTimings: true,
      ignore: [{ ruleId: "secret-leak", reason: "known false positive" }],
      overrides: [
        {
          files: ["src/generated/**"],
          rules: { "secret-leak": "off" },
          ignore: [{ ruleId: "workflow-permissions" }],
          exclude: ["src/generated/vendor/**"]
        }
      ]
    });

    expect(config.rules["workflow-permissions"]).toBe("error");
    expect(config.reportTimings).toBe(true);
    expect(config.overrides).toHaveLength(1);
  });
});
