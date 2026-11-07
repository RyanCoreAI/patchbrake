import { spawnSync } from "node:child_process";

// The parser consumes a machine-readable patch, independent of the user's
// color, prefix, textconv and output-indicator preferences.
const PATCH_OPTIONS = [
  "--no-ext-diff", "--no-textconv", "--no-color", "--no-relative", "--unified=3",
  "--src-prefix=a/", "--dst-prefix=b/", "--line-prefix=",
  "--output-indicator-new=+", "--output-indicator-old=-", "--output-indicator-context= "
];

export function isInsideGitRepo(cwd: string): boolean {
  const result = runGit(["rev-parse", "--is-inside-work-tree"], cwd, false);
  return result.status === 0 && result.stdout.trim() === "true";
}

export function getStagedDiff(cwd: string): string {
  const result = runGit(["diff", "--staged", ...PATCH_OPTIONS], cwd, true);
  return result.stdout;
}

export function getRangeDiff(cwd: string, base: string, head: string): string {
  const result = runGit(["diff", ...PATCH_OPTIONS, `${base}...${head}`, "--"], cwd, true);
  return result.stdout;
}

export function getGitVersion(cwd: string): string | undefined {
  const result = runGit(["--version"], cwd, false);
  return result.status === 0 ? result.stdout.trim() : undefined;
}

function runGit(args: string[], cwd: string, throwOnError: boolean): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024
  });

  if (throwOnError && result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
  }

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}
