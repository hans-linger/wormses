/**
 * A harmonic contributes one additive term to a worm's half-width at a given
 * arc position and time. Implementations live in `src/systems/harmonics.ts`.
 */
export interface HarmonicContext {
	/** Segment index along the spine (arc position), head = 0. */
	readonly i: number;
	/** Total segment count. */
	readonly length: number;
	/** Base body width parameter of the worm. */
	readonly baseWidth: number;
	/** Current speed in px/s. */
	readonly velocity: number;
	/** Simulation time in seconds. */
	readonly time: number;
}

export type Harmonic = (ctx: HarmonicContext) => number;
