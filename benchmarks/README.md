# PatchBrake benchmark fixtures

`cases.json` is the public AI diff risk benchmark used by `npm run benchmark` and `patchbrake benchmark`.

Each case includes:

- `id`
- `description`
- unified `diff`
- expected rule ids

Keep benchmark cases anonymized, deterministic, and paired with a false-positive or false-negative reason when possible.
