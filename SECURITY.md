# Security Policy

## Supported Versions

PatchBrake is an early open source CLI. Security fixes are handled for the latest published minor version.

| Version | Supported |
|---|---|
| 0.2.x | Yes |
| <= 0.1.x | Critical fixes only |

## Reporting a Vulnerability

Please do not open a public issue with exploit details, private tokens, or sensitive repository content.

Use GitHub private vulnerability reporting for this repository when available. If that option is not available, open a public issue with only:

- the affected PatchBrake version
- the affected command or rule
- a short impact summary
- a note that private details are available for maintainers

Do not include real secrets. Use redacted examples or synthetic tokens.

## Scope

Security reports that are especially useful:

- raw secret values appearing in text, JSON, or SARIF output
- custom rule loading behavior that can execute code unexpectedly
- GitHub Action behavior that weakens repository permissions or trust boundaries
- malformed diff or config input that crashes PatchBrake or bypasses configured blocking behavior

PatchBrake is not a full SAST scanner. Missed vulnerabilities in arbitrary project code are usually out of scope unless they are caused by PatchBrake behavior.
