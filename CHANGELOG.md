# Changelog

## 0.1.0

- Added `patchbrake scan --staged` for local staged diff scanning.
- Added `patchbrake scan --base <ref> --head <ref>` for commit range scanning.
- Added deterministic rules for secret leaks, deleted tests, risky GitHub Actions permissions, migration risk, and prompt/config drift.
- Added text and JSON reporters.
- Added `.patchbrakerc.json` initialization and config loading.
- Added a composite GitHub Action entrypoint.
