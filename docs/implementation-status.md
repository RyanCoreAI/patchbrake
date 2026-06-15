# Implementation Status

This file tracks the execution plan as release gates. Each phase must end with verification before the next phase starts.

## Phase 1: Local CLI MVP

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
- 5 built-in deterministic rules
- fixtures and unit tests
- GitHub Action
- README and docs

Verification:

- `npm run check`
- `node dist/cli.js rules`
- `node dist/cli.js scan --staged --format json`
- `npm pack --dry-run`

## Phase 3: Release Readiness

Status: blocked on external account actions

Required external actions:

- Replace `your-org` placeholders after the GitHub repo is created.
- Confirm final npm package name from the publishing account.
- Record a real `assets/demo.gif` from the built CLI.
- Publish GitHub release and npm package.

Verification after external actions:

- Install with `npm install -g patchbrake`.
- Run `patchbrake doctor`.
- Run `patchbrake scan --staged` in a fixture repo.
- Run the GitHub Action in a pull request.
