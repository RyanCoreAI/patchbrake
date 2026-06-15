import type { Rule } from "../types";
import { authRegressionRule } from "./auth-regression";
import { dangerousShellRule } from "./dangerous-shell";
import { deletedTestsRule } from "./deleted-tests";
import { dependencyRiskRule } from "./dependency-risk";
import { migrationRiskRule } from "./migration-risk";
import { packageScriptRiskRule } from "./package-script-risk";
import { promptConfigDriftRule } from "./prompt-config-drift";
import { secretLeakRule } from "./secret-leak";
import { workflowPermissionsRule } from "./workflow-permissions";

export const builtinRules: Rule[] = [
  secretLeakRule,
  deletedTestsRule,
  workflowPermissionsRule,
  migrationRiskRule,
  promptConfigDriftRule,
  authRegressionRule,
  packageScriptRiskRule,
  dangerousShellRule,
  dependencyRiskRule
];
