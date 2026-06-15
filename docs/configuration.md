# Configuration

PatchBrake reads `.patchbrakerc.json` or `patchbrake.config.json` from the current working directory.

Create a starter config:

```bash
patchbrake init
```

## Fields

```json
{
  "failOn": "error",
  "outputFormat": "text",
  "include": ["**"],
  "exclude": ["node_modules/**", "dist/**", "coverage/**", ".git/**"],
  "maxFileSizeBytes": 512000,
  "rules": {
    "secret-leak": "error",
    "deleted-tests": "error",
    "workflow-permissions": "warn",
    "migration-risk": "warn",
    "prompt-config-drift": "warn"
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
