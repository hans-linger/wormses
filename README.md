# wormses

Math-generated worms: an ecosystem of creatures whose shapes are not drawn
but computed — each body outline is the live sum of harmonics evaluated
along the spine.

Originally built in 2016 on Backbone + KineticJS (preserved in `_old/`),
rewritten in 2026 as strict TypeScript with a headless simulation core.

## The math

A worm is a spine of segments with follow-the-leader kinematics. Segment
`i`'s half-width at time `t` is the sum of three harmonics:

| Harmonic | Formula | Effect |
|---|---|---|
| envelope | `\|sin(π·i/L)\|·W` | body taper — zero at head and tail |
| head thickening | `(i + L/10)^(1.4 − i/L)` | the bulbous face |
| wobble | `\|sin(5t − i/20)\|·(v/60 + i/10)` | traveling peristaltic ripple |

The worm is rendered as one stroke per segment, perpendicular to the spine —
the signature bristly look. Harmonics are composable functions
([src/simulation/harmonics.ts](src/simulation/harmonics.ts)) and can be
scaled live from the debug panel (press `H`).

Self-intersection is prevented at two levels, both derived from the width
profile: the steering turn rate is capped so the head's turning radius never
drops below the local body radius, and each spine joint clamps its bend to
`spacing / (halfWidth · widthRadiusFactor)`. Worms avoid each other and eggs
via feeler-based steering over capsule-chain obstacles.

## Ecosystem

Worms seek food (green grows length, blue grows width, red grows speed),
slow near world edges, and die of overgrowth — fading out and leaving an
egg, which hatches into a fresh worm. Click pauses; hovering a worm shows
its stats in the debug panel.

## Architecture

```
src/core        pure math: Vec2, angles, seedable Rng
src/simulation  headless world — no DOM imports, deterministic per seed
src/render      Renderer interface + Canvas2D implementation
src/app         fixed-timestep loop, input, debug panel
```

The simulation emits read-only snapshots (spine points + radius profile);
renderers interpret them. A future 3D renderer implements the same
`Renderer` interface by lofting each spine into a tube — the harmonics are
functions of arc position and time only and carry over unchanged.

## Commands

```bash
pnpm dev      # dev server
pnpm test     # vitest (simulation core is fully headless-tested)
pnpm lint     # typescript-eslint strict, no-explicit-any
pnpm build    # typecheck + bundle
```
