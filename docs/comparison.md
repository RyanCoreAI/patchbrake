# Comparison

PatchBrake is not an AI code reviewer and not a full SAST scanner.

PatchBrake is a local safety gate for AI-generated patches. It scans the diff before commit or PR merge and flags deterministic risk signals such as leaked secrets, deleted tests, widened GitHub Actions permissions, destructive migrations, and agent config drift.

| Tool type | Examples | Difference |
|---|---|---|
| AI PR reviewer | CodeRabbit, Greptile, Qodo | They review code with AI. PatchBrake checks deterministic diff risk locally without calling an LLM. |
| Secret scanner | Gitleaks, TruffleHog | They deeply scan secrets. PatchBrake catches AI patch risks across secrets, tests, workflows, migrations, and config. |
| SAST | Semgrep, CodeQL | They scan codebases and code patterns. PatchBrake scans the patch before commit. |
| GitHub Actions scanner | zizmor | zizmor is deeper for GitHub Actions. PatchBrake combines workflow risk with broader AI patch risk signals. |
| Dependency scanner | npm audit, Snyk, Dependabot | They focus on vulnerable dependencies. PatchBrake flags risky dependency spec changes in the current diff. |

## When PatchBrake Fits

- You use Claude Code, Codex, Cursor, Copilot, or another AI coding tool.
- You want a fast local check before `git commit`.
- You want CI to block obvious risky diffs before merge.
- You do not want to upload code to a SaaS product.
- You want deterministic, explainable findings rather than model-generated review comments.

## When PatchBrake Does Not Fit

- You need deep static analysis across the entire codebase.
- You need vulnerability reachability analysis.
- You need a complete secret scanning program with history scanning and revocation workflows.
- You want an AI reviewer that comments on style, design, or correctness.
- You want a web dashboard.

PatchBrake should sit alongside tools like CodeQL, Semgrep, Gitleaks, TruffleHog, zizmor, Snyk, and human review. It is intentionally narrow: scan this diff before it ships.

