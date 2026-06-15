import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "../config";
import { loadCustomRules } from "../custom-rules";
import { parseDiff } from "../diff-parser";
import { runRules } from "../rule-engine";
import { builtinRules } from "../rules";

interface BenchmarkCase {
  id: string;
  description: string;
  diff: string;
  expectedRuleIds: string[];
}

interface BenchmarkFile {
  version: 1;
  cases: BenchmarkCase[];
}

export function runBenchmark(cwd: string, casesPath = "benchmarks/cases.json") {
  const targetPath = path.resolve(cwd, casesPath);
  const parsed = JSON.parse(fs.readFileSync(targetPath, "utf8")) as BenchmarkFile;
  const config = loadConfig(cwd);
  const rules = [...builtinRules, ...loadCustomRules(cwd, config)];
  const failures = [];

  for (const testCase of parsed.cases) {
    const result = runRules(parseDiff(testCase.diff), rules, config, {
      cwd,
      staged: true,
      format: "json",
      failOn: "never",
      ignoreBaseline: true
    });
    const actualRuleIds = Array.from(new Set(result.findings.filter((finding) => !finding.suppressed).map((finding) => finding.ruleId))).sort();
    const expectedRuleIds = [...testCase.expectedRuleIds].sort();

    if (actualRuleIds.join(",") !== expectedRuleIds.join(",")) {
      failures.push({
        id: testCase.id,
        description: testCase.description,
        expectedRuleIds,
        actualRuleIds
      });
    }
  }

  return {
    total: parsed.cases.length,
    passed: parsed.cases.length - failures.length,
    failed: failures.length,
    failures
  };
}
