# Configuration

PatchBrake reads `.patchbrakerc.json` or `patchbrake.config.json` from the current working directory.

Create a starter config:

```bash
npx patchbrake init
```

PatchBrake validates config at runtime and fails fast on unsupported fields, invalid severity values, invalid output formats, invalid `failOn` values, malformed arrays, or non-positive `maxFileSizeBytes`. This avoids silently weakening a safety gate because of a typo.

## Fields

```json
{
  "failOn": "error",
  "outputFormat": "text",
  "include": ["**"],
  "exclude": ["node_modules/**", "dist/**", "coverage/**", ".git/**"],
  "maxFileSizeBytes": 512000,
  "reportTimings": false,
  "baseline": ".patchbrake-baseline.json",
  "ignore": [],
  "extends": ["patchbrake-config-ai-coding"],
  "customRules": [],
  "overrides": [],
  "rules": {
    "secret-leak": "error",
    "workflow-permissions": "warn",
    "migration-risk": "warn",
    "prompt-config-drift": "warn",
    "auth-regression": "warn",
    "package-script-risk": "warn",
    "dangerous-shell": "warn",
    "dependency-risk": "warn"
  }
}
```

## Rule levels

Use `off`, `info`, `warn`, or `error`.

```json
{
  "rules": {
    "prompt-config-drift": "off",
    "workflow-permissions": "error"
  }
}
```

## Shareable configs

Built-in shareable configs:

- `patchbrake-config-ai-coding`
- `patchbrake-config-node`
- `patchbrake-config-github-actions`

```json
{
  "extends": ["patchbrake-config-ai-coding"]
}
```

## Monorepo overrides

Use `overrides` for directory-scoped rule behavior:

```json
{
  "overrides": [
    {
      "files": ["packages/web/**"],
      "rules": {
        "prompt-config-drift": "off"
      }
    }
  ]
}
```

Current override semantics are intentionally conservative: overrides only affect rules that are already enabled globally. If a rule is globally set to `off`, a directory override will not re-enable it in this release.
