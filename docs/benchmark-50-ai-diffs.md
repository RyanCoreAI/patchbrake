# Benchmark: AI Diff Risk Cases

The benchmark is the credibility layer for PatchBrake. It contains anonymized bad and safe diffs gathered from realistic AI-assisted coding workflows.

Current benchmark: `benchmarks/cases.json`

Run it with:

```bash
npm run benchmark
```

## Initial categories

- leaked secrets
- deleted tests
- risky workflow permissions
- destructive migrations
- prompt/config drift
- auth-regression
- package-script-risk
- dangerous-shell
- dependency-risk

## Case format

```json
{
  "id": "case-001-secret-openai-key",
  "description": "OpenAI-style API key added to application config.",
  "diff": "diff --git ...",
  "expectedRuleIds": ["secret-leak"]
}
```

## Release gate

Before widening any rule, run the full benchmark and check that false positives do not increase without an intentional fixture update.

Target for v1.0: expand from 30 cases to 50-100 cases using real false-positive and false-negative reports.
