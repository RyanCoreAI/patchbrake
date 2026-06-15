# Rule Taxonomy

PatchBrake rules focus on diff-level risk patterns that are high signal in AI-assisted coding workflows.

## v0.1 categories

| Category | Rules | Goal |
|---|---|---|
| Secrets | `secret-leak` | Prevent obvious credential commits |
| Tests | `deleted-tests` | Catch coverage removal before commit |
| Workflow | `workflow-permissions` | Flag risky GitHub Actions permission changes |
| Migration | `migration-risk` | Surface destructive data changes |
| Prompt/config | `prompt-config-drift` | Treat AI instruction edits as behavior changes |

## Rule design principles

- Prefer high precision over broad coverage.
- Report only changed lines or changed files.
- Make every finding explainable without calling an LLM.
- Add bad and safe fixtures before widening a rule.
