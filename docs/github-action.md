# GitHub Action

PatchBrake ships a composite GitHub Action that installs the npm package and scans a PR diff.

This action requires the `patchbrake` npm package to be published.

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
      - uses: RyanCoreAI/patchbrake@v0.1.0
        with:
          base: origin/${{ github.base_ref }}
          head: HEAD
          fail-on: error
```

## SARIF upload

PatchBrake can emit SARIF for GitHub code scanning:

```yaml
name: PatchBrake SARIF
on:
  pull_request:

permissions:
  contents: read
  security-events: write

jobs:
  patchbrake:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install -g patchbrake
      - run: patchbrake scan --base origin/${{ github.base_ref }} --head HEAD --format sarif --output patchbrake.sarif --fail-on never
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: patchbrake.sarif
```

## Notes

- Use `fetch-depth: 0` so the base and head refs are available.
- Uploading SARIF requires `security-events: write`.
- Keep permissions narrow. `contents: read` is enough for text output.
- Fork PRs should avoid privileged workflows and secrets.
- Use `--fail-on never` when uploading SARIF but not blocking PRs.
