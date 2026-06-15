## PatchBrake v0.1.2

PatchBrake is a local safety gate for AI-generated patches.

### Fixes

- Fixed CLI --version output to match the published package version.
- Keeps the v0.1 release line publish-ready after the npm v0.1.1 smoke test found a stale hardcoded CLI version.

### Verified

- npm package can be installed through npx.
- scan --staged detects risky staged diffs.
- secret excerpts are redacted in output.
- risky deleted tests and GitHub Actions permission changes are reported.

### Try it

npx patchbrake@0.1.2 scan --staged

### Scope

No LLM. No dashboard. No code upload. Just scan the diff before you commit.
