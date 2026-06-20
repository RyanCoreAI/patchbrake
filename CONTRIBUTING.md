# Contributing

Thanks for helping improve PatchBrake. The most useful contributions are real false positives, real bad diff cases, and narrowly scoped rule improvements.

## Development Setup

Requirements:

- Node.js 20+
- npm
- Git

```bash
npm install
npm run build
npm test
npm run check
```

Run the CLI locally after build:

```bash
node dist/cli.js scan --staged
```

## What To Contribute

Good first contributions:

- false positive fixtures
- realistic bad diff fixtures
- docs that make setup or output clearer
- rule precision improvements with safe and bad examples

Before changing a rule, add or update tests that show:

- a risky diff is detected
- a safe diff stays clean
- any redacted output does not leak raw secrets

## Reporting False Positives

Use the false positive issue template and include:

- rule id
- anonymized diff
- actual finding
- expected behavior
- why the change is safe

Do not include real tokens, credentials, private repository code, or customer data.

## Custom Rules And Ignores

Changes that add custom rule loading, inline ignore behavior, or GitHub Actions permission changes need extra review. These features affect PatchBrake's trust boundary and CI behavior.

## Pull Requests

Keep PRs focused. A good PatchBrake PR usually changes one behavior, one rule, or one docs surface at a time.

Run before opening a PR:

```bash
npm run check
npm audit --omit=dev
```
