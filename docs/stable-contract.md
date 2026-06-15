# Stable Contract

PatchBrake will treat these as stable at v1.0:

- CLI command names and exit code behavior
- `.patchbrakerc.json` schema
- JSON report summary and finding fields
- SARIF rule ids, locations, levels, and fingerprints
- Built-in rule ids
- Custom rule `Rule`, `RuleContext`, and `FindingDraft` shapes

## Exit codes

- `0`: no active finding at or above `failOn`
- `1`: active finding at or above `failOn`
- `2`: runtime or configuration error

Suppressed findings do not affect exit code.
