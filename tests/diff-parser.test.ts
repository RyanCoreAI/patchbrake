import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseDiff } from "../src/diff-parser";

describe("parseDiff", () => {
  it("parses files, hunks, and added lines", () => {
    const diff = fs.readFileSync(path.join(process.cwd(), "fixtures/secret-leak/bad.diff"), "utf8");
    const files = parseDiff(diff);

    expect(files).toHaveLength(1);
    expect(files[0]?.newPath).toBe("src/config.ts");
    expect(files[0]?.hunks).toHaveLength(1);
    expect(files[0]?.hunks[0]?.lines.some((line) => line.type === "add" && line.newLineNumber === 3)).toBe(true);
  });
});
