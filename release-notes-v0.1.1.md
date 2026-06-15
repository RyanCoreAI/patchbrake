## PatchBrake v0.1.1

PatchBrake is a local safety gate for AI-generated patches.

### Highlights

- Published the first npm-ready CLI package.
- Run PatchBrake with:

```bash
npx patchbrake@0.1.1 scan --staged
```

- Hardened secret redaction across text, JSON, and SARIF output.
- Improved deleted-test severity behavior:
  - deleted test file => error
  - removed test call/assertion => warning
  - removed test call with replacement coverage => info
- Added cross-platform CI matrix for Ubuntu/Windows and Node 20/22.
- Updated release readiness docs, GitHub Action metadata, and changelog.

### Scope

No LLM. No dashboard. No code upload. Just scan the diff before you commit.
