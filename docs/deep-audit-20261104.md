# Deep audit repairs (2026-11-04)

- `**/` includes zero or more directories and `?` matches one non-separator character. Parsed repository paths retain actual `a/` and `b/` directories; diff prefixes are removed once by the parser.
- Placeholder suppression applies to the matched value, not unrelated comments or words elsewhere on the line. Quoted JSON assignments and high-confidence tokens in comments are scanned.
- All rule findings, including inline-ignore findings, redact recognized token formats and complete secret assignments before report output. One line triggering another rule cannot reintroduce the same recognized secret in its excerpt.

Regression tests use synthetic values only. This remains a heuristic diff scanner, not a complete secret detector. Changed redacted excerpts can change secret-rule fingerprints: review regenerated baselines rather than copying exceptions blindly. Reports do not include raw diff files, though the programmatic scan result still includes the requested input diff for callers.

Verification: TypeScript build, full Vitest suite, deterministic benchmark and Git whitespace check. No major development dependency migration is included.
