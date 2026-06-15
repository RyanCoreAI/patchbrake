# Release Policy

## Versioning

- Patch: precision fixes, documentation fixes, safe reporter additions.
- Minor: new rules, new config fields, new integrations.
- Major: breaking CLI, config, JSON, SARIF, or rule API changes.

## Rule maturity

- Stable rules may block by default if severity is `error`.
- Beta rules default to `warn`.
- A beta rule graduates only after benchmark coverage and false-positive review.

## Release gates

Every release must pass:

```bash
npm ci
npm run check
npm pack --dry-run
```
