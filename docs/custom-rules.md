# Custom Rules

Custom rule loading is not part of v0.1. PatchBrake starts with built-in deterministic rules so the result is easy to trust and test.

The future custom-rule interface should preserve the current model:

- input: parsed diff files
- output: findings with rule id, severity, location, message, and remediation
- tests: bad and safe fixtures are required
