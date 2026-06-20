## Summary

Describe the change and why it is needed.

## Change Type

- [ ] Rule precision or behavior
- [ ] CLI / config / reporter behavior
- [ ] GitHub Action / CI
- [ ] Docs / demo / community files
- [ ] Tests / fixtures / benchmark

## Trust Boundary Checklist

- [ ] Does not add remote code execution or remote rule loading
- [ ] Does not weaken secret redaction
- [ ] Does not add or broaden `patchbrake-ignore*` behavior without tests
- [ ] Does not widen GitHub Actions permissions without explanation
- [ ] If custom rules are involved, the PR explains local code execution risk

## Testing

Commands run:

```text

```

## Notes For Reviewers

Call out any expected false positives, behavior changes, or follow-up work.
