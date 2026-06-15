# Changelog

## 0.1.1

- Hardened `secret-leak` redaction for bare OpenAI keys, GitHub tokens, GitHub fine-grained tokens, AWS access keys, private key headers, and assignment-style secrets.
- Adjusted `deleted-tests` severity so deleted test files stay `error`, removed test calls are `warn`, and replaced test coverage is `info`.
- Updated README, GitHub Action docs, implementation status, and changelog for release readiness while npm publishing is still pending.
- Expanded CI to run on Ubuntu and Windows with Node 20 and 22.
- Added release-readiness regression tests for redaction, deleted-test severity, and public release docs.

## 0.1.0

- Added `patchbrake scan --staged` for local staged diff scanning.
- Added `patchbrake scan --base <ref> --head <ref>` for commit range scanning.
- Added deterministic rules for secret leaks, deleted tests, risky GitHub Actions permissions, migration risk, and prompt/config drift.
- Added beta rules for auth regression, package script risk, dangerous shell patterns, and risky dependency specifiers.
- Added text, JSON, and SARIF reporters.
- Added `.patchbrakerc.json` initialization, config loading, shareable configs, monorepo overrides, and local custom rule loading.
- Added baseline and ignore support with suppressed findings in reports.
- Added a 30-case benchmark and `patchbrake benchmark`.
- Added a composite GitHub Action entrypoint.
