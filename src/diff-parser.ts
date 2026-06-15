import type { DiffFile, DiffFileStatus, DiffHunk, DiffLine } from "./types";
import { normalizePath } from "./path-utils";

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

    if (raw.startsWith("--- ")) {
      currentFile.oldPath = parsePathHeader(raw.slice(4), currentFile.oldPath);
      continue;
    }

    if (raw.startsWith("+++ ")) {
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
  const match = /^diff --git a\/(.+) b\/(.+)$/.exec(raw);
  const oldPath = match ? normalizePath(match[1]) : "unknown";
  const newPath = match ? normalizePath(match[2]) : oldPath;

  return {
    oldPath,
    newPath,
    status: "modified",
    hunks: []
  };
}

function parsePathHeader(rawPath: string, fallback: string): string {
  if (rawPath === "/dev/null") {
    return rawPath;
  }

  const pathOnly = rawPath.split("\t")[0] ?? rawPath;
  return normalizePath(pathOnly.replace(/^[ab]\//, "")) || fallback;
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
