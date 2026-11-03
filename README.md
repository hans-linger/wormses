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

## Collision mechanics

Worm bodies are capsule chains — one circle per spine segment, radius equal
to that segment's harmonic half-width. Everything else (food, eggs) is a
circle. Four layers keep bodies apart:

1. **Self-intersection.** The steering turn rate is capped so the head's
   turning radius never drops below the local body radius, and each spine
   joint clamps its bend to `spacing / (halfWidth · widthRadiusFactor)`. A
   worm physically cannot fold onto itself.
2. **Predictive avoidance.** A forward feeler ([collision.ts](src/systems/collision.ts))
   finds the nearest solid body in the path. Clearance is the *widest* part
   of the body, not the head — the tail goes wherever the head went, so a gap
   the head fits through but the belly does not is no gap at all. The feeler
   reaches farther the fatter and faster the worm is, since turning radius
   grows with width. Worms commit to a side rather than dithering.
3. **Personal space.** The feeler only sees straight ahead, so worms sharing
   a patch would slide along each other. A separation term pushes away from
   any foreign body crowding the head. Only the component *across* the
   heading is steered on — steering on the raw direction gives a bang-bang
   controller that slams between full left and full right as a neighbour
   drifts past the nose, and worms lock into oscillation.
4. **Hard contact resolution.** Position-based correction over a uniform
   spatial hash, run again after every worm has moved (per-worm resolution
   only sees start-of-tick geometry, so two worms closing on each other would
   both act on stale data). Corrections are capped per iteration: without
   that cap, deeply overlapping bodies feed each other ever-larger pushes and
   fling each other into the walls.

Food and eggs are **light scenery that yields**: a mature worm is wider than
the gaps between food items, so no amount of steering could keep a crowded
field collision-free. Worms shove them aside instead, and nothing ever
spawns inside a body.

## Ecosystem

Worms seek food (green grows length, blue grows width, red grows speed),
slow near world edges, and die of overgrowth — fading out and leaving an
egg, which hatches into a fresh worm. Click pauses; hovering a worm shows
its stats in the debug panel.

## Architecture

Files are split by domain, and tests live outside the source tree.

```
src/contracts   types only — config, snapshots, simulation ports, Renderer
src/core        pure math: Vec2, angles, seedable Rng, typeguards
src/models      domain entities: World, Worm, Spine, Egg, Food
src/systems     stateless algorithms: harmonics, collision, steering
src/config      default tuning values
src/render      Renderer implementations (canvas2d) + palette
src/app         fixed-timestep loop, input, debug panel
tests/          mirrors core/models/systems
```

`core`, `contracts`, `models`, `systems` and `config` are the headless
simulation: deterministic per seed, no DOM, and an ESLint rule forbids them
from importing anything under `render/` or `app/`.

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
