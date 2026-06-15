export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^a\//, "").replace(/^b\//, "");
}

export function getDisplayPath(path: string): string {
  const normalized = normalizePath(path);
  return normalized === "/dev/null" ? normalized : normalized.replace(/^\.\//, "");
}

export function isProbablyTestPath(path: string): boolean {
  const normalized = normalizePath(path).toLowerCase();
  return (
    /(^|\/)(__tests__|tests?|specs?)(\/|$)/.test(normalized) ||
    /(\.|-|_)(test|spec)\.[cm]?[jt]sx?$/.test(normalized) ||
    /_test\.(go|py|rb)$/.test(normalized)
  );
}

export function isWorkflowPath(path: string): boolean {
  return /^\.github\/workflows\/[^/]+\.(ya?ml)$/i.test(normalizePath(path));
}

export function isMigrationPath(path: string): boolean {
  const normalized = normalizePath(path).toLowerCase();
  return (
    normalized.endsWith(".sql") ||
    normalized.includes("/migrations/") ||
    normalized.includes("/migration/") ||
    normalized.includes("/schema/") ||
    normalized.includes("prisma/schema.prisma") ||
    normalized.includes("drizzle/")
  );
}

export function isPromptConfigPath(path: string): boolean {
  const normalized = normalizePath(path).toLowerCase();
  return (
    normalized === "agents.md" ||
    normalized === "claude.md" ||
    normalized.endsWith("/agents.md") ||
    normalized.endsWith("/claude.md") ||
    normalized === ".github/copilot-instructions.md" ||
    normalized.startsWith(".cursor/rules/") ||
    normalized.startsWith("prompts/") ||
    normalized.includes("/prompts/") ||
    normalized.includes("system-prompt") ||
    normalized.includes("system_prompt") ||
    normalized.includes("/policy/")
  );
}

export function matchesAnyGlob(path: string, patterns: string[]): boolean {
  const normalized = normalizePath(path);
  return patterns.some((pattern) => globToRegExp(pattern).test(normalized));
}

function globToRegExp(pattern: string): RegExp {
  const normalized = normalizePath(pattern);
  let source = "";

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (char === "*" && next === "*") {
      source += ".*";
      i += 1;
    } else if (char === "*") {
      source += "[^/]*";
    } else if (char === "?") {
      source += ".";
    } else {
      source += escapeRegExp(char);
    }
  }

  return new RegExp(`^${source}$`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
}
