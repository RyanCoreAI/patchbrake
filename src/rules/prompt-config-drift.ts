import type { Rule } from "../types";
import { getChangedLineCount, getFilePath } from "../diff-parser";
import { isPromptConfigPath } from "../path-utils";

export const promptConfigDriftRule: Rule = {
  id: "prompt-config-drift",
  meta: {
    category: "prompt-config",
    defaultSeverity: "warn",
    description: "Detects edits to agent instructions, prompts, and AI coding policy files.",
    remediation: "Review prompt/config changes as behavior changes, not ordinary text edits."
  },
  run(context) {
    const findings = [];

    for (const file of context.files) {
      const filePath = getFilePath(file);
      if (!isPromptConfigPath(filePath)) {
        continue;
      }

      const changedLines = getChangedLineCount(file);
      if (changedLines === 0) {
        continue;
      }

      findings.push({
        ruleId: "prompt-config-drift",
        category: "prompt-config" as const,
        severity: "warn" as const,
        message: `AI prompt/config file changed (${changedLines} changed line(s)).`,
        filePath,
        remediation: "Confirm the instruction change is intentional and mention it in the PR or commit notes."
      });
    }

    return findings;
  }
};
