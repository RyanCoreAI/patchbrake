import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const action = fs.readFileSync(path.join(process.cwd(), "action.yml"), "utf8");
const scripts = Array.from(action.matchAll(/      run: \|\r?\n((?:        .*\r?\n?)*)/g), match =>
  match[1].split(/\r?\n/).map(line => line.replace(/^        /, "")).join("\n")
);
const gitBash = path.join(process.env.ProgramFiles || "C:/Program Files", "Git/bin/bash.exe");
const bash = process.platform === "win32" && fs.existsSync(gitBash) ? gitBash : "bash";
const defaults = {
  PATCHBRAKE_VERSION: "0.2.0",
  PATCHBRAKE_BASE: "origin/main",
  PATCHBRAKE_HEAD: "HEAD",
  PATCHBRAKE_FORMAT: "text",
  PATCHBRAKE_FAIL_ON: "error",
  PATCHBRAKE_OUTPUT: "",
  PATCHBRAKE_ALLOW_CUSTOM_RULES: "false",
  PATCHBRAKE_ALLOW_INLINE_IGNORE: "false",
  PATCHBRAKE_FAIL_ON_NEW_IGNORE: "true"
};
function run(script: string, env: Record<string, string> = {}) {
  return spawnSync(bash, ["-c", 'npm() { printf "%s\\n" "$@"; }; patchbrake() { printf "%s\\n" "$@"; };\n' + script], {
    env: { ...process.env, ...defaults, ...env }, encoding: "utf8", windowsHide: true
  });
}

describe("composite Action input boundaries", () => {
  it("passes every input through env instead of interpolating shell source", () => {
    expect(scripts).toHaveLength(2);
    for (const script of scripts) expect(script).not.toContain("${{");
    for (const name of ["version", "base", "head", "format", "fail-on", "output", "allow-custom-rules", "allow-inline-ignore", "fail-on-new-ignore"]) {
      expect(action).toContain(`: \${{ inputs.${name} }}`);
    }
  });
  it("keeps command substitutions, quotes and newlines literal in argument values", () => {
    const malicious = 'HEAD$(printf${IFS}INJECTED)";printf BAD;#\nnext';
    const result = run(scripts[1], { PATCHBRAKE_HEAD: malicious, PATCHBRAKE_OUTPUT: malicious });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(`--head\n${malicious}\n`);
    expect(result.stdout).toContain(`--output\n${malicious}\n`);
  });
  it("validates pinned versions before invoking npm", () => {
    for (const version of ["0.2.0", "1.2.3-beta.1+build.2"]) {
      expect(run(scripts[0], { PATCHBRAKE_VERSION: version }).status).toBe(0);
    }
    for (const version of ["latest", "0.2.0$(printf${IFS}BAD)", "0.2.0\nBAD", "../local"]) {
      const result = run(scripts[0], { PATCHBRAKE_VERSION: version });
      expect(result.status).toBe(2);
      expect(result.stdout).toBe("");
    }
  });
  it("rejects invalid boolean input without invoking the scanner", () => {
    const result = run(scripts[1], { PATCHBRAKE_ALLOW_CUSTOM_RULES: 'false$(printf${IFS}BAD)' });
    expect(result.status).toBe(2);
    expect(result.stdout).toBe("");
  });
});
