export type {
  BaselineFile,
  Category,
  Config,
  ConfigOverride,
  DiffFile,
  DiffHunk,
  DiffLine,
  Finding,
  FindingDraft,
  IgnoreEntry,
  OutputFormat,
  ResolvedConfig,
  Rule,
  RuleContext,
  RuleMeta,
  ScanOptions,
  ScanResult,
  Severity
} from "./types";

export { parseDiff } from "./diff-parser";
export { runRules, shouldFail } from "./rule-engine";
