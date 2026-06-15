import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";
import { parseDiff } from "../src/diff-parser";
import { formatSarifReport } from "../src/reporters/sarif";
import { runRules } from "../src/rule-engine";
import { builtinRules } from "../src/rules";

describe("SARIF reporter", () => {
  it("emits SARIF 2.1.0 with findings", () => {
    const diff = fs.readFileSync(path.join(process.cwd(), "fixtures/secret-leak/bad.diff"), "utf8");
    const files = parseDiff(diff);
    const result = runRules(files, builtinRules, loadConfig(process.cwd()), {
      cwd: process.cwd(),
      staged: true,
      format: "sarif",
      failOn: "error"
    });

    const sarif = JSON.parse(formatSarifReport(result));

    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs[0].tool.driver.name).toBe("PatchBrake");
    expect(sarif.runs[0].results[0].ruleId).toBe("secret-leak");
    expect(sarif.runs[0].results[0].partialFingerprints.patchbrakeFingerprint).toMatch(/^[a-f0-9]{24}$/);
  });
});
