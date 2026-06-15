## PatchBrake v0.1.3

PatchBrake is a local safety gate for AI-generated patches.

### Highlights

- Pins the GitHub Action npm install path to `patchbrake@0.1.3` instead of `latest`.
- Installs with `--ignore-scripts` in the composite Action.
- Adds npm, CI, and MIT license badges to the README.
- Sets the package author to `PatchBrake contributors`.
- Reads the CLI version from `package.json` to prevent future version drift.
- Updates Action examples to use `RyanCoreAI/patchbrake@v0.1.3` and `version: "0.1.3"`.
- Adds release-readiness tests for badges, author, pinned Action version, `--ignore-scripts`, and non-hardcoded CLI version.

### Try it

```bash
npx patchbrake@0.1.3 scan --staged
Scope

No LLM. No dashboard. No code upload. Just scan the diff before you commit.
