# Changelog

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
