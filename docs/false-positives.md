# False Positives

PatchBrake should stay useful by keeping false positives easy to report and fast to fix.

## Report format

Include:

- rule id
- anonymized diff
- why the change is safe
- expected behavior
- actual finding

## Maintainer policy

- Add a safe fixture before relaxing a rule.
- Prefer a narrower pattern over a suppression list.
- Keep high-risk broad rules at `warn` until precision is proven.

## Suppression options

- Add a finding to `.patchbrake-baseline.json` when it is accepted existing risk.
- Use config `ignore` for a narrow fingerprint/rule/path suppression.
- Use inline comments for intentionally safe examples during local development:

```ts
const fake = "sk-test..."; // patchbrake-ignore secret-leak
```

Suppressed findings remain visible in text, JSON, and SARIF output, but they do not affect the exit code.

In CI, prefer reviewed config ignores or baselines. The GitHub Action defaults to disabling inline ignore suppression and failing when a diff adds new `patchbrake-ignore*` comments.
