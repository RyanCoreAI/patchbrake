# Rule Reference

## Stable rules

### `secret-leak`

Flags likely secrets added in a diff, including private keys, GitHub tokens, OpenAI-style keys, AWS access keys, and secret assignments.

### `deleted-tests`

Flags deleted test files and removed `describe`, `it`, `test`, or `expect` lines. Deleting an entire test file is `error`; removing test calls is `warn`; removing test calls while adding replacement coverage in the same diff is `info`.

### `workflow-permissions`

Flags GitHub Actions `pull_request_target` and write-scoped permissions.

### `migration-risk`

Flags destructive SQL changes such as `DROP TABLE`, `TRUNCATE`, and `DELETE FROM` without `WHERE`.

### `prompt-config-drift`

Flags AI instruction and prompt configuration changes such as `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, and prompt directories.

## Beta rules

Beta rules default to `warn` and should not block PRs unless a project opts in.

### `auth-regression`

Flags high-confidence auth guard removals in auth-sensitive files.

### `package-script-risk`

Flags risky npm lifecycle scripts and shell-heavy package scripts.

### `dangerous-shell`

Flags pipe-to-shell, destructive remove, permissive chmod, and PowerShell execution bypass patterns.

### `dependency-risk`

Flags wildcard, `latest`, URL, git, file, and link dependency specifiers.
