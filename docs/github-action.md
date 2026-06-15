# GitHub Action

PatchBrake ships a composite GitHub Action that installs the npm package and scans a PR diff.

This action requires the `patchbrake` npm package to be published.

Pin both the Action tag and the npm `version` input for reproducible runs.

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
      - uses: RyanCoreAI/patchbrake@v0.1.3
        with:
          base: origin/${{ github.base_ref }}
          head: HEAD
          version: "0.1.3"
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
      - uses: RyanCoreAI/patchbrake@v0.1.3
        with:
          base: origin/${{ github.base_ref }}
          head: HEAD
          version: "0.1.3"
          format: sarif
          output: patchbrake.sarif
          fail-on: never
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: patchbrake.sarif
```

## Notes

- Use `fetch-depth: 0` so the base and head refs are available.
- Keep the Action tag and `version` input pinned together, for example `v0.1.3` and `"0.1.3"`.
- Uploading SARIF requires `security-events: write`.
- Keep permissions narrow. `contents: read` is enough for text output.
- Fork PRs should avoid privileged workflows and secrets.
- Use `--fail-on never` when uploading SARIF but not blocking PRs.
