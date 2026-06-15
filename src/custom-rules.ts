import path from "node:path";
import type { ResolvedConfig, Rule } from "./types";

export function loadCustomRules(cwd: string, config: ResolvedConfig): Rule[] {
  return config.customRules.flatMap((rulePath) => loadCustomRule(cwd, rulePath));
}

function loadCustomRule(cwd: string, rulePath: string): Rule[] {
  if (/^https?:\/\//i.test(rulePath)) {
    throw new Error(`Remote custom rules are not supported: ${rulePath}`);
  }

  const resolvedPath = rulePath.startsWith(".") || path.isAbsolute(rulePath) ? path.resolve(cwd, rulePath) : require.resolve(rulePath, { paths: [cwd] });
  // Custom rules are explicit local code execution by design. Remote loading is rejected above.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const loaded = require(resolvedPath) as { default?: unknown; rule?: unknown; rules?: unknown };
  const candidate = loaded.default ?? loaded.rule ?? loaded.rules ?? loaded;
  const rules = Array.isArray(candidate) ? candidate : [candidate];

  for (const rule of rules) {
    assertRule(rule, resolvedPath);
  }

  return rules as Rule[];
}

function assertRule(value: unknown, source: string): asserts value is Rule {
  const rule = value as Partial<Rule>;
  if (!rule || typeof rule.id !== "string" || typeof rule.run !== "function" || !rule.meta) {
    throw new Error(`Invalid custom rule export from ${source}. Expected a PatchBrake Rule.`);
  }
}
