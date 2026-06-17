# Rule Reference

## Stable rules

### `secret-leak`

Flags likely secrets added in a diff, including private keys, GitHub tokens, OpenAI-style keys, AWS access keys, and secret assignments.

### `deleted-tests`

Flags deleted test files and removed `describe`, `it`, `test`, or `expect` lines. Deleting an entire test file is `error`; removing test calls is `warn`; removing test calls while adding replacement coverage in the same diff is `info`.

Limitation: this is a diff-level heuristic for common JavaScript/TypeScript test shapes. It does not replace language-specific coverage or test discovery.

### `workflow-permissions`

Flags GitHub Actions `pull_request_target`, `permissions: write-all`, and write-scoped `GITHUB_TOKEN` permissions such as `contents`, `issues`, `pages`, `statuses`, `attestations`, and `id-token`.

### `migration-risk`

Flags destructive SQL changes such as `DROP TABLE`, `TRUNCATE`, and `DELETE FROM` without `WHERE`.

Limitation: this rule reads added diff lines, not a full SQL AST. It should be treated as a guard for obvious migration risk, not database-specific safety proof.

### `prompt-config-drift`

Flags AI instruction and prompt configuration changes such as `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, and prompt directories.

## Beta rules

Beta rules default to `warn` and should not block PRs unless a project opts in.

### `auth-regression`

Flags high-confidence auth guard removals in auth-sensitive files.

Limitation: this beta rule looks for common guard names and auth-sensitive paths. It can miss project-specific authorization patterns and should stay `warn` unless tuned for a repository.

### `package-script-risk`

Flags risky npm lifecycle scripts and shell-heavy package scripts.

### `dangerous-shell`

Flags pipe-to-shell, destructive remove, permissive chmod, and PowerShell execution bypass patterns.

### `dependency-risk`

Flags wildcard, `latest`, URL, git, file, and link dependency specifiers.
