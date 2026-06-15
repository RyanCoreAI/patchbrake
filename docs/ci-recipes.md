# CI Recipes

## Blocking PRs

```yaml
- run: npx patchbrake scan --base origin/${{ github.base_ref }} --head HEAD --fail-on error
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
  - uses: actions/setup-node@v4
    with:
      node-version: 20
  - run: npm install -g patchbrake
  - run: patchbrake scan --base origin/${{ github.base_ref }} --head HEAD --format sarif --output patchbrake.sarif --fail-on never
  - uses: github/codeql-action/upload-sarif@v3
    with:
      sarif_file: patchbrake.sarif
```

## JSON artifact

```bash
patchbrake scan --staged --format json --output patchbrake-report.json
```
