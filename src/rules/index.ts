import type { Rule } from "../types";
import { deletedTestsRule } from "./deleted-tests";
import { migrationRiskRule } from "./migration-risk";
import { promptConfigDriftRule } from "./prompt-config-drift";
import { secretLeakRule } from "./secret-leak";
import { workflowPermissionsRule } from "./workflow-permissions";

export const builtinRules: Rule[] = [
  secretLeakRule,
  deletedTestsRule,
  workflowPermissionsRule,
  migrationRiskRule,
  promptConfigDriftRule
];
