# Changelog

## 0.2.0

- Added runtime validation for `.patchbrakerc.json`, `patchbrake.config.json`, extended configs, rule severity values, output formats, ignore entries, overrides, and size limits.
- Added CI safety switches: `--no-custom-rules`, `--disallow-inline-ignore`, and `--fail-on-new-ignore`.
- Hardened the GitHub Action defaults so CI does not load repository-local custom rule code, does not allow inline ignore suppressions, and fails on newly added `patchbrake-ignore*` comments.
- Expanded `workflow-permissions` coverage for current GitHub `GITHUB_TOKEN` write permissions, including `issues`, `pages`, `statuses`, `attestations`, `artifact-metadata`, `code-quality`, and `discussions`.
- Made `reportTimings` control text and JSON timing output instead of always emitting rule timings.
- Documented override semantics, inline ignore governance, custom rule trust boundaries, and heuristic rule limitations.

## 0.1.3

- Hardened the GitHub Action install path by pinning the default npm package version and installing with `--ignore-scripts`.
- Documented pinned Action tag and npm `version` input usage for reproducible CI runs.
- Added README npm, CI, and license badges.
- Added package author metadata.
- Updated CI recipes to use pinned `npx patchbrake@0.1.3` examples.

## 0.1.2

- Fixed CLI `--version` output to match the published package version.

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
