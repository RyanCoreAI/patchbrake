# AI Coding Workflows

PatchBrake is designed to run after an AI coding tool edits files and before those edits land.

## Claude Code / Codex / Cursor pattern

Use the same gate in every tool:

```bash
npx patchbrake scan --staged
```

Recommended workflow:

1. Ask the AI coding tool to make a scoped change.
2. Review the diff.
3. Stage the intended files.
4. Run PatchBrake.
5. Fix or explicitly suppress any finding.
6. Commit.

## Agent instruction snippet

```md
Before finalizing code changes, run `npx patchbrake scan --staged`.
If PatchBrake reports an error, fix the diff or explain the narrow suppression used.
Do not bypass PatchBrake by broadening ignore patterns.
```
