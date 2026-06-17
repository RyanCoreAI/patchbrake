# Custom Rules

PatchBrake can load explicit local custom rules from compiled JavaScript modules. It does not load remote rules.

## Config

```json
{
  "customRules": ["./patchbrake-rules/no-todo.cjs"]
}
```

## Rule shape

```js
module.exports = {
  id: "no-todo",
  meta: {
    category: "unknown",
    defaultSeverity: "warn",
    description: "Flags TODO comments added in diffs.",
    remediation: "Open a tracked issue instead of landing TODO comments."
  },
  run(context) {
    return context.files.flatMap((file) =>
      file.hunks.flatMap((hunk) =>
        hunk.lines
          .filter((line) => line.type === "add" && line.content.includes("TODO"))
          .map((line) => ({
            ruleId: "no-todo",
            category: "unknown",
            severity: "warn",
            message: "TODO comment added.",
            filePath: file.newPath,
            line: line.newLineNumber
          }))
      )
    );
  }
};
```

## Safety

- Use local file paths or installed packages only.
- Remote `http://` and `https://` rule paths are rejected.
- Treat custom rules as local code execution.
- In CI, disable custom rules unless the repository and PR trust boundary are clear:

```bash
npx patchbrake scan --base origin/main --head HEAD --no-custom-rules
```

The GitHub Action defaults to `allow-custom-rules: "false"` for this reason.
