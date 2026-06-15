# PatchBrake

A local safety gate for AI-generated patches.

AI coding tools move fast. PatchBrake checks the diff before you commit and flags the risky changes that are easy to miss in review:

- leaked secrets
- deleted tests
- risky GitHub Actions permissions
- destructive migrations
- prompt and agent config drift

```bash
npx patchbrake scan --staged
```

No LLM. No dashboard. No code upload. Just scan the diff before it ships.

## Quickstart

```bash
# install from npm after release
npm install -g patchbrake

# or run directly
npx patchbrake scan --staged
```

Scan staged changes:

```bash
patchbrake scan --staged
```

Scan a commit range:

```bash
patchbrake scan --base origin/main --head HEAD
```

Write JSON for CI or scripts:

```bash
patchbrake scan --staged --format json --output patchbrake-report.json
```

Write SARIF for GitHub code scanning:

```bash
patchbrake scan --base origin/main --head HEAD --format sarif --output patchbrake.sarif
```

Create a config file:

```bash
patchbrake init
```

## Example Output

```text
PatchBrake found 3 risky diff finding(s).
Scanned 3 file(s) with 5 rule(s).

ERROR secret-leak src/config.ts:4
  Possible secret assignment added in this diff.
  > OPENAI_API_KEY=sk-test...
  Fix: Remove the value from git history, rotate it if real, and load it from environment or CI secrets.

ERROR deleted-tests tests/auth.test.ts:12
  2 test case or assertion line(s) removed.
  > it("rejects anonymous users", async () => {
  Fix: Confirm the deleted coverage is replaced or intentionally obsolete.

WARN workflow-permissions .github/workflows/release.yml:8
  Workflow permission was widened to write scope.
  > contents: write
  Fix: Restrict the permission to the minimum read/write scope needed for this job.
```

## Rules

| Rule | Default | What it catches |
|---|---:|---|
| `secret-leak` | error | New API keys, private keys, tokens, or env secrets |
| `deleted-tests` | error | Deleted test files or removed test/assertion lines |
| `workflow-permissions` | warn | `write-all`, write scopes, and `pull_request_target` in GitHub Actions |
| `migration-risk` | warn | `DROP`, `TRUNCATE`, unsafe `DELETE`, and destructive migration statements |
| `prompt-config-drift` | warn | Changes to `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, prompts, and policy files |

List rules:

```bash
patchbrake rules
patchbrake explain secret-leak
```

## Configuration

PatchBrake reads `.patchbrakerc.json` or `patchbrake.config.json` in the current working directory.

```json
{
  "failOn": "error",
  "outputFormat": "text",
  "include": ["**"],
  "exclude": ["node_modules/**", "dist/**", "coverage/**", ".git/**"],
  "rules": {
    "secret-leak": "error",
    "deleted-tests": "error",
    "workflow-permissions": "warn",
    "migration-risk": "warn",
    "prompt-config-drift": "warn"
  }
}
```

Disable a noisy rule:

```json
{
  "rules": {
    "prompt-config-drift": "off"
  }
}
```

## GitHub Action

Use the composite action after this repository is published. Replace `your-org` with the final GitHub owner:

```yaml
name: PatchBrake
on:
  pull_request:

permissions:
  contents: read

jobs:
  patchbrake:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: your-org/patchbrake@v0.1.0
        with:
          base: origin/${{ github.base_ref }}
          head: HEAD
          fail-on: error
```

See [docs/github-action.md](docs/github-action.md) for details.

## Project Scope

PatchBrake is not a SaaS, web dashboard, AI PR reviewer, or full SAST scanner. It intentionally starts as a deterministic local CLI for obvious diff-level risk signals.

## Development

```bash
npm install
npm run build
npm test
npm run check
```

Run locally after build:

```bash
node dist/cli.js scan --staged
```

Release gates are tracked in [docs/implementation-status.md](docs/implementation-status.md) and [docs/release-checklist.md](docs/release-checklist.md).

## Roadmap

- v0.1: deterministic CLI, JSON output, config, GitHub Action, 5 rules.
- v0.2: baseline/ignore support, pre-commit hook docs, richer rule packs.
- v0.3: beta auth-regression and package-script-risk rules.

## Contributing

The most useful contributions are false positive reports and real-world bad diff fixtures. Use the issue templates so each report includes the diff shape, expected result, and actual finding.

## License

MIT
