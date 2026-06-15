# Benchmark: 50 AI Diff Risk Cases

The benchmark is the credibility layer for PatchBrake. It should contain anonymized bad and safe diffs gathered from real AI-assisted coding workflows.

## Initial categories

- leaked secrets
- deleted tests
- risky workflow permissions
- destructive migrations
- prompt/config drift
- future: auth-regression
- future: package-script-risk

## Case format

```text
case-001-secret-openai-key/
  bad.diff
  safe.diff
  expected-findings.json
  explanation.md
```

## Release gate

Before widening any rule, run the full benchmark and check that false positives do not increase without an intentional fixture update.
