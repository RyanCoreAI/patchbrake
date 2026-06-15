export type Severity = "off" | "info" | "warn" | "error";

export type Category =
  | "secrets"
  | "tests"
  | "workflow"
  | "migration"
  | "prompt-config"
  | "auth"
  | "package"
  | "shell"
  | "dependency"
  | "unknown";

export type DiffLineType = "add" | "remove" | "context";

export interface DiffLine {
  type: DiffLineType;
  content: string;
  raw: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  section?: string;
  lines: DiffLine[];
}

export type DiffFileStatus = "added" | "modified" | "deleted" | "renamed";

export interface DiffFile {
  oldPath: string;
  newPath: string;
  status: DiffFileStatus;
  hunks: DiffHunk[];
  isBinary?: boolean;
}

export interface RuleMeta {
  category: Category;
  defaultSeverity: Severity;
  description: string;
  remediation: string;
  maturity?: "stable" | "beta";
}

export interface Rule {
  id: string;
  meta: RuleMeta;
  run(context: RuleContext): FindingDraft[];
}

export interface RuleContext {
  files: DiffFile[];
  config: ResolvedConfig;
  options: ScanOptions;
}

export interface FindingDraft {
  ruleId: string;
  category: Category;
  message: string;
  filePath: string;
  line?: number;
  excerpt?: string;
  severity?: Severity;
  remediation?: string;
}

export interface Finding extends FindingDraft {
  id: string;
  fingerprint: string;
  severity: Exclude<Severity, "off">;
  suppressed?: Suppression;
}

export interface Suppression {
  kind: "baseline" | "config" | "inline";
  reason?: string;
}

export interface IgnoreEntry {
  fingerprint?: string;
  ruleId?: string;
  filePath?: string;
  line?: number;
  reason?: string;
}

export interface RuleConfigObject {
  level?: Severity;
  severity?: Severity;
  enabled?: boolean;
  [key: string]: unknown;
}

export type RuleConfigValue = Severity | RuleConfigObject;

export interface Config {
  extends?: string[];
  rules?: Record<string, RuleConfigValue>;
  include?: string[];
  exclude?: string[];
  ignore?: Array<string | IgnoreEntry>;
  baseline?: string;
  customRules?: string[];
  overrides?: ConfigOverride[];
  maxFileSizeBytes?: number;
  failOn?: "warn" | "error" | "never";
  outputFormat?: OutputFormat;
  reportTimings?: boolean;
}

export interface ResolvedConfig {
  extends: string[];
  rules: Record<string, RuleConfigValue>;
  include: string[];
  exclude: string[];
  ignore: Array<string | IgnoreEntry>;
  baseline?: string;
  baselinePath?: string;
  baselineFingerprints: Set<string>;
  customRules: string[];
  overrides: ConfigOverride[];
  maxFileSizeBytes: number;
  failOn: "warn" | "error" | "never";
  outputFormat: OutputFormat;
  reportTimings: boolean;
  configPath?: string;
}

export interface ConfigOverride {
  files: string[];
  rules?: Record<string, RuleConfigValue>;
  ignore?: Array<string | IgnoreEntry>;
  exclude?: string[];
}

export interface ScanOptions {
  cwd: string;
  staged: boolean;
  base?: string;
  head?: string;
  format: OutputFormat;
  output?: string;
  failOn: "warn" | "error" | "never";
  configPath?: string;
  ignoreBaseline?: boolean;
}

export interface ScanResult {
  files: DiffFile[];
  findings: Finding[];
  rulesRun: string[];
  skippedFiles: SkippedFile[];
  ruleTimings: RuleTiming[];
}

export type OutputFormat = "text" | "json" | "sarif";

export interface SkippedFile {
  filePath: string;
  reason: "excluded" | "too-large";
  detail?: string;
}

export interface RuleTiming {
  ruleId: string;
  durationMs: number;
}

export interface BaselineFile {
  version: 1;
  generatedAt: string;
  findings: Array<{
    fingerprint: string;
    ruleId: string;
    filePath: string;
    message: string;
    reason?: string;
  }>;
}
