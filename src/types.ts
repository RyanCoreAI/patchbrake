export type Severity = "off" | "info" | "warn" | "error";

export type Category =
  | "secrets"
  | "tests"
  | "workflow"
  | "migration"
  | "prompt-config"
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
}

export interface RuleConfigObject {
  level?: Severity;
  severity?: Severity;
  enabled?: boolean;
  [key: string]: unknown;
}

export type RuleConfigValue = Severity | RuleConfigObject;

export interface Config {
  rules?: Record<string, RuleConfigValue>;
  include?: string[];
  exclude?: string[];
  maxFileSizeBytes?: number;
  failOn?: "warn" | "error" | "never";
  outputFormat?: OutputFormat;
}

export interface ResolvedConfig {
  rules: Record<string, RuleConfigValue>;
  include: string[];
  exclude: string[];
  maxFileSizeBytes: number;
  failOn: "warn" | "error" | "never";
  outputFormat: OutputFormat;
  configPath?: string;
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
}

export interface ScanResult {
  files: DiffFile[];
  findings: Finding[];
  rulesRun: string[];
}

export type OutputFormat = "text" | "json" | "sarif";
