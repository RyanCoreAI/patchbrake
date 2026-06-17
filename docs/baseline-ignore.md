# Baseline And Ignore

PatchBrake supports suppressions without hiding them.

## Baseline

Generate a baseline from the current scan:

```bash
patchbrake baseline --staged
```

This writes `.patchbrake-baseline.json`. Findings in the baseline still appear in reports with `suppressed.kind = "baseline"`, but they do not affect the exit code.

## Config ignore

Use config ignores for narrow, reviewed exceptions:

```json
{
  "ignore": [
    {
      "ruleId": "prompt-config-drift",
      "filePath": "docs/examples/**",
      "reason": "Example prompt fixtures are reviewed separately."
    }
  ]
}
```

String entries are treated as finding fingerprints:

```json
{
  "ignore": ["3c10712e5de1e9748259961e"]
}
```

## Inline ignore

Use inline ignores only for intentionally safe examples during local development:

```ts
const fakeKey = "sk-test..."; // patchbrake-ignore secret-leak
```

Supported forms:

- `patchbrake-ignore <rule-id>`
- `patchbrake-ignore-next-line <rule-id>`
- `patchbrake-ignore-file <rule-id>`

In CI, prefer reviewed config ignores or baselines. The GitHub Action defaults to `allow-inline-ignore: "false"` and `fail-on-new-ignore: "true"`, so a PR cannot add a risky line and suppress it in the same diff without review.

CLI flags:

```bash
npx patchbrake scan --staged --disallow-inline-ignore
npx patchbrake scan --staged --fail-on-new-ignore
```
