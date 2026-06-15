# 60-second demo script

This is the recording script for `assets/demo.gif`. Do not add a fake GIF; record the real CLI after a release build.

1. Stage a patch that adds a token-like value, removes a test, and widens a GitHub Actions permission.
2. Run:

```bash
npx patchbrake scan --staged
```

3. Show the three findings and exit code.
4. Close with: "No LLM. No dashboard. No code upload. PatchBrake scans the diff before you commit."
