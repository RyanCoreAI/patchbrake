# Demo Case

This demo patch includes three risky changes that are common in AI-generated diffs:

- a leaked OpenAI-style key
- a deleted auth test
- a widened GitHub Actions permission

## Reproduce Locally

Create a clean demo repository:

```bash
mkdir patchbrake-demo
cd patchbrake-demo
git init
mkdir -p src tests .github/workflows
```

Create a safe baseline:

```bash
printf 'export const config = {};\n' > src/config.ts
printf 'it("rejects anonymous users", () => {});\n' > tests/auth.test.ts
cat > .github/workflows/release.yml <<'YAML'
name: Release
on: [push]
permissions:
  contents: read
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
YAML
git add .
git commit -m "baseline safe project"
```

Apply a risky patch:

```bash
printf 'OPENAI_API_KEY="sk-proj-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"\n' > src/config.ts
rm tests/auth.test.ts
cat > .github/workflows/release.yml <<'YAML'
name: Release
on: [push]
permissions: write-all
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
YAML
git add .
```

Run PatchBrake:

```bash
npx patchbrake scan --staged
```

## Expected Findings

```text
ERROR secret-leak src/config.ts:1
  Possible OpenAI API key added in this diff.
  > OPENAI_API_KEY="sk-...redacted"

ERROR deleted-tests tests/auth.test.ts
  Test file deleted in this diff.

WARN workflow-permissions .github/workflows/release.yml:3
  Workflow permission was widened to write scope.
  > permissions: write-all
```

PatchBrake should exit with code `1` because the diff contains error-level findings.

The secret value should be redacted in text, JSON, and SARIF output.

