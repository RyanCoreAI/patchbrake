# PatchBrake benchmark fixtures

This directory is reserved for the public AI diff risk benchmark.

The intended shape for each case is:

```text
case-001-secret-openai-key/
  bad.diff
  safe.diff
  expected-findings.json
  explanation.md
```

The benchmark should grow from real false-positive and false-negative reports. Keep fixtures anonymized and deterministic.
