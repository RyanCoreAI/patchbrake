# Implementation Status

This file tracks the execution plan as release gates. Each phase must end with verification before the next phase starts.

## Phase 1: Local CLI Core

Status: complete

Deliverables:

- TypeScript CLI package
- `patchbrake scan --staged`
- staged diff reader
- unified diff parser
- rule engine
- text reporter
- exit code behavior

Verification:

- `npm run check`
- `node dist/cli.js --help`
- `node dist/cli.js scan --staged`

## Phase 2: v0.1 Feature Set

Status: complete

Deliverables:

- `--base` / `--head` range scan
- JSON reporter
- `.patchbrakerc.json`
- 5 stable deterministic rules
- fixtures and unit tests
- GitHub Action
- README and docs

Verification:

- `npm run check`
- `node dist/cli.js rules`
- `node dist/cli.js scan --staged --format json`
- `npm pack --dry-run`

## Phase 3: Trust And Adoption

Status: complete locally

Deliverables:

- `.patchbrake-baseline.json` support
- config ignore entries
- inline ignore comments
- suppressed findings in text, JSON, and SARIF
- skipped file reporting
- rule timing summary
- hook, CI, and AI coding workflow docs
- 30-case public benchmark

Verification:

- `npm run check`
- `patchbrake benchmark`

## Phase 4: Rule Precision Expansion

Status: complete locally

Deliverables:

- beta `auth-regression`
- beta `package-script-risk`
- beta `dangerous-shell`
- beta `dependency-risk`
- benchmark coverage for bad and safe cases

Verification:

- `npm run check`
- `patchbrake benchmark`

## Phase 5: Extensibility Foundation

Status: complete locally

Deliverables:

- custom local rule loading
- exported rule/type API
- built-in shareable configs
- monorepo path overrides
- stable contract and release policy docs

Verification:

- custom rule integration test
- shareable config test
- path override and skip tests

## Phase 6: Release Readiness

Status: complete for the current public release

Required external actions:

- Push repository to `RyanCoreAI/patchbrake`: complete.
- Publish npm package `patchbrake`: complete.
- Publish GitHub release/tag `v0.1.2`: complete.
- Record a real `assets/demo.gif` from the built CLI: complete.

Verification after external actions:

- Install with `npm install -g patchbrake`.
- Run `patchbrake doctor`.
- Run `patchbrake scan --staged` in a fixture repo.
- Run the GitHub Action in a pull request.
