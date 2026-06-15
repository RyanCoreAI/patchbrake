# Release Checklist

Run this checklist before publishing a version.

## Local gate

```bash
npm ci
npm run check
node dist/cli.js doctor
node dist/cli.js rules
node dist/cli.js scan --staged --format json
node dist/cli.js scan --staged --format sarif --output patchbrake.sarif
npm pack --dry-run
```

## Metadata gate

- `package.json` version is correct.
- `package.json` repository/homepage/bugs fields are added only after the real GitHub owner is known.
- `README.md` examples match implemented commands.
- `CHANGELOG.md` has the release notes.
- `action.yml` inputs match `docs/github-action.md`.
- GitHub placeholders are replaced with the real owner/repo.

## Demo gate

- Record the demo from the built CLI, not a mock.
- Show one secret finding, one deleted-tests finding, and one workflow-permissions finding.
- Keep the first public demo under 90 seconds.

## Publish gate

```bash
npm publish --access public
git tag v0.1.0
git push origin main --tags
```

Do not publish until the repo name, npm name, and demo are final.
