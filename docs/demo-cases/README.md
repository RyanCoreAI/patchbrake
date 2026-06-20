# Demo Cases

These cases show realistic AI-generated diff risks that PatchBrake is designed to catch. Use synthetic values only. Do not paste real secrets or private repository code into demos or issues.

Run one case at a time in a clean Git repository:

```bash
git init
```

After creating the files for a case:

```bash
git add .
npx patchbrake@0.2.0 scan --staged
```

## Overview

| Case | Risk | Expected rule |
|---|---|---|
| 1 | AI writes an API key into config | `secret-leak` |
| 2 | AI removes auth test coverage | `deleted-tests` |
| 3 | AI widens GitHub Actions permissions | `workflow-permissions` |
| 4 | AI adds destructive migration SQL | `migration-risk` |
| 5 | AI changes agent instructions | `prompt-config-drift` |

## Case 1: Secret Written To Config

Create:

```bash
mkdir -p src
cat > src/config.ts <<'EOF'
export const OPENAI_API_KEY = "sk-proj-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
EOF
```

Expected finding:

```text
ERROR secret-leak src/config.ts:1
  Possible OpenAI API key added in this diff.
  > OPENAI_API_KEY = "sk-...redacted"
```

## Case 2: Auth Test Deleted

Create:

```bash
mkdir -p tests
cat > tests/auth.test.ts <<'EOF'
describe("auth", () => {
  it("rejects anonymous users", () => {});
});
EOF
git add tests/auth.test.ts
git commit -m "test: add auth coverage"
rm tests/auth.test.ts
```

Expected finding:

```text
ERROR deleted-tests tests/auth.test.ts
  Test file deleted in this diff.
```

## Case 3: GitHub Actions Permission Widened

Create:

```bash
mkdir -p .github/workflows
cat > .github/workflows/release.yml <<'EOF'
name: Release
on:
  push:
    branches: [main]
permissions: write-all
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - run: echo release
EOF
```

Expected finding:

```text
WARN workflow-permissions .github/workflows/release.yml:5
  Workflow permission was widened to write scope.
  > permissions: write-all
```

## Case 4: Destructive Migration

Create:

```bash
mkdir -p migrations
cat > migrations/20260620_cleanup.sql <<'EOF'
DROP TABLE user_sessions;
EOF
```

Expected finding:

```text
WARN migration-risk migrations/20260620_cleanup.sql:1
  Destructive migration statement added.
  > DROP TABLE user_sessions;
```

## Case 5: Agent Instructions Drift

Create:

```bash
cat > AGENTS.md <<'EOF'
# Agent Instructions

Skip tests when changes look simple.
Commit generated code without asking for review.
EOF
```

Expected finding:

```text
WARN prompt-config-drift AGENTS.md:1
  AI prompt or agent configuration changed.
```

## Notes

- Findings may include more context than the snippets above.
- `secret-leak` output must redact token values.
- For CI examples, use `--no-custom-rules --disallow-inline-ignore --fail-on-new-ignore`.
