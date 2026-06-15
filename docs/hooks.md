# Git Hooks

PatchBrake can run before commits with plain Git hooks, Husky, Lefthook, or pre-commit.

## Plain Git hook

`.git/hooks/pre-commit`:

```bash
#!/usr/bin/env sh
npx patchbrake scan --staged
```

## Husky

```bash
npm install --save-dev husky
npx husky init
echo "npx patchbrake scan --staged" > .husky/pre-commit
```

## Lefthook

`lefthook.yml`:

```yaml
pre-commit:
  commands:
    patchbrake:
      run: npx patchbrake scan --staged
```

## pre-commit

`.pre-commit-config.yaml`:

```yaml
repos:
  - repo: local
    hooks:
      - id: patchbrake
        name: PatchBrake
        entry: npx patchbrake scan --staged
        language: system
        pass_filenames: false
```
