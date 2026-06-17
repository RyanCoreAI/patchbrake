# CI Recipes

## Blocking PRs

```yaml
- run: npx patchbrake@0.2.0 scan --base origin/${{ github.base_ref }} --head HEAD --fail-on error --no-custom-rules --disallow-inline-ignore --fail-on-new-ignore
```

## Non-blocking SARIF upload

```yaml
permissions:
  contents: read
  security-events: write

steps:
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0
  - run: npx patchbrake@0.2.0 scan --base origin/${{ github.base_ref }} --head HEAD --format sarif --output patchbrake.sarif --fail-on never --no-custom-rules --disallow-inline-ignore --fail-on-new-ignore
  - uses: github/codeql-action/upload-sarif@v3
    with:
      sarif_file: patchbrake.sarif
```

## JSON artifact

```bash
npx patchbrake@0.2.0 scan --staged --format json --output patchbrake-report.json
```
