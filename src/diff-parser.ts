import type { DiffFile, DiffFileStatus, DiffHunk, DiffLine } from "./types";

const HUNK_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@\s?(.*)$/;

export function parseDiff(diff: string): DiffFile[] {
  const files: DiffFile[] = [];
  const lines = diff.split(/\r?\n/);
  let currentFile: DiffFile | undefined;
  let currentHunk: DiffHunk | undefined;
  let oldLine = 0;
  let newLine = 0;

  for (const raw of lines) {
    if (raw.startsWith("diff --git ")) {
      currentFile = parseDiffGitLine(raw);
      currentHunk = undefined;
      files.push(currentFile);
      continue;
    }

    if (!currentFile) {
      continue;
    }

    if (raw.startsWith("new file mode ")) {
      currentFile.status = "added";
      continue;
    }

    if (raw.startsWith("deleted file mode ")) {
      currentFile.status = "deleted";
      continue;
    }

    if (raw.startsWith("similarity index ") || raw.startsWith("rename from ") || raw.startsWith("rename to ")) {
      currentFile.status = "renamed";
      continue;
    }

    if (raw.startsWith("Binary files ")) {
      currentFile.isBinary = true;
      continue;
    }

    if (!currentHunk && raw.startsWith("--- ")) {
      currentFile.oldPath = parsePathHeader(raw.slice(4), currentFile.oldPath);
      continue;
    }

    if (!currentHunk && raw.startsWith("+++ ")) {
      currentFile.newPath = parsePathHeader(raw.slice(4), currentFile.newPath);
      continue;
    }

    const hunkMatch = HUNK_RE.exec(raw);
    if (hunkMatch) {
      oldLine = Number(hunkMatch[1]);
      newLine = Number(hunkMatch[3]);
      currentHunk = {
        oldStart: oldLine,
        oldLines: Number(hunkMatch[2] ?? "1"),
        newStart: newLine,
        newLines: Number(hunkMatch[4] ?? "1"),
        section: hunkMatch[5] || undefined,
        lines: []
      };
      currentFile.hunks.push(currentHunk);
      continue;
    }

    if (!currentHunk) {
      continue;
    }

    const parsedLine = parseHunkLine(raw, oldLine, newLine);
    if (!parsedLine) {
      continue;
    }

    currentHunk.lines.push(parsedLine.line);
    oldLine = parsedLine.nextOldLine;
    newLine = parsedLine.nextNewLine;
  }

  return files;
}

function parseDiffGitLine(raw: string): DiffFile {
  const paths = splitDiffPaths(raw.slice("diff --git ".length));
  const oldPath = paths ? parsePathHeader(paths[0], "unknown") : "unknown";
  const newPath = paths ? parsePathHeader(paths[1], oldPath) : oldPath;

  return {
    oldPath,
    newPath,
    status: "modified",
    hunks: []
  };
}

// Avoid backtracking across ambiguous spaces in attacker-controlled filenames.
// Quoted tokens are consumed once; unquoted paths use the last Git prefix boundary.
function quotedPathEnd(value: string, start: number): number {
  for (let i = start + 1; i < value.length; i += 1) {
    if (value[i] === "\\") i += 1;
    else if (value[i] === '"') return i;
  }
  return -1;
}

function splitDiffPaths(value: string): [string, string] | undefined {
  let boundary: number;
  if (value.startsWith('"')) {
    boundary = quotedPathEnd(value, 0) + 1;
    if (boundary === 0 || value[boundary] !== " ") return undefined;
  } else {
    if (!value.startsWith("a/")) return undefined;
    const quotedBoundary = value.lastIndexOf(' "');
    boundary = quotedBoundary > 2 && quotedPathEnd(value, quotedBoundary + 1) === value.length - 1
      ? quotedBoundary
      : value.lastIndexOf(" b/");
    if (boundary <= 2) return undefined;
  }
  const second = value.slice(boundary + 1);
  if (second.startsWith('"')) {
    if (quotedPathEnd(second, 0) !== second.length - 1) return undefined;
  } else if (!second.startsWith("b/") || second.length <= 2) {
    return undefined;
  }
  return [value.slice(0, boundary), second];
}

function parsePathHeader(rawPath: string, fallback: string): string {
  if (rawPath === "/dev/null") {
    return rawPath;
  }

  const pathOnly = rawPath.split("\t")[0] ?? rawPath;
  // Git paths always use slash separators. Backslashes inside a C-quoted path
  // are filename data, so decode before stripping the single diff prefix.
  return decodeGitPath(pathOnly).replace(/^[ab]\//, "") || fallback;
}

function decodeGitPath(value: string): string {
  if (!value.startsWith('"')) return value;
  if (!value.endsWith('"')) throw new Error("Invalid quoted path in git diff.");

  const bytes: number[] = [];
  const escapes: Record<string, number> = { a: 7, b: 8, t: 9, n: 10, v: 11, f: 12, r: 13, '"': 34, "\\": 92 };
  for (let i = 1; i < value.length - 1; i += 1) {
    if (value[i] !== "\\") {
      const codePoint = value.codePointAt(i)!;
      bytes.push(...Buffer.from(String.fromCodePoint(codePoint), "utf8"));
      if (codePoint > 0xffff) i += 1;
      continue;
    }

    const escaped = value[++i];
    if (escaped in escapes) {
      bytes.push(escapes[escaped]);
      continue;
    }
    if (/[0-7]/.test(escaped ?? "")) {
      const octal = value.slice(i).match(/^[0-7]{1,3}/)![0];
      const byte = parseInt(octal, 8);
      if (byte > 255) throw new Error("Invalid octal path escape in git diff.");
      bytes.push(byte);
      i += octal.length - 1;
      continue;
    }
    throw new Error("Invalid path escape in git diff.");
  }
  return Buffer.from(bytes).toString("utf8");
}

function parseHunkLine(
  raw: string,
  oldLine: number,
  newLine: number
): { line: DiffLine; nextOldLine: number; nextNewLine: number } | undefined {
  if (raw.startsWith("\\ No newline at end of file")) {
    return undefined;
  }

  const prefix = raw[0];
  const content = raw.slice(1);

  if (prefix === "+") {
    return {
      line: {
        type: "add",
        content,
        raw,
        newLineNumber: newLine
      },
      nextOldLine: oldLine,
      nextNewLine: newLine + 1
    };
  }

  if (prefix === "-") {
    return {
      line: {
        type: "remove",
        content,
        raw,
        oldLineNumber: oldLine
      },
      nextOldLine: oldLine + 1,
      nextNewLine: newLine
    };
  }

  return {
    line: {
      type: "context",
      content: prefix === " " ? content : raw,
      raw,
      oldLineNumber: oldLine,
      newLineNumber: newLine
    },
    nextOldLine: oldLine + 1,
    nextNewLine: newLine + 1
  };
}

export function getFilePath(file: DiffFile): string {
  return file.newPath === "/dev/null" ? file.oldPath : file.newPath;
}

export function getAddedLines(file: DiffFile) {
  return file.hunks.flatMap((hunk) => hunk.lines.filter((line) => line.type === "add"));
}

export function getRemovedLines(file: DiffFile) {
  return file.hunks.flatMap((hunk) => hunk.lines.filter((line) => line.type === "remove"));
}

export function getChangedLineCount(file: DiffFile): number {
  return file.hunks.reduce(
    (count, hunk) => count + hunk.lines.filter((line) => line.type === "add" || line.type === "remove").length,
    0
  );
}
