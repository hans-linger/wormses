import type { Harmonic, HarmonicContext } from "../contracts/harmonics";

/**
 * The shape harmonics — the heart of the project.
 *
 * A worm's outline is not stored anywhere: segment i's half-width is the sum
 * of independent harmonics evaluated at arc position i and time t. Ported
 * from `_old/src/modules/index/v/worms/worm.js` (fY), with time rescaled from
 * milliseconds to seconds and velocity from px/frame (60fps) to px/second.
 */

/**
 * Live-tuning gains for the debug panel. Multiplying instead of replacing
 * keeps every formula intact; at the default of 1 the output is exactly the
 * original. Mutated only by UI code — the simulation never writes here.
 */
export const harmonicGains = {
	envelope: 1,
	headThickening: 1,
	wobble: 1,
};

/** Body envelope: |sin(π·i/L)|·W — zero at head and tail, W mid-body. */
export const envelope: Harmonic = ({ i, length, baseWidth }) =>
	harmonicGains.envelope *
	Math.abs(Math.sin((Math.PI * i) / length)) *
	baseWidth;

/** Head thickening: (i + L/10)^(1.4 − i/L) — the bulbous face. */
export const headThickening: Harmonic = ({ i, length }) =>
	harmonicGains.headThickening * Math.pow(i + length / 10, 1.4 - i / length);

/**
 * Traveling body wobble: |sin(5t − i/20)|·(v/60 + i/10).
 * Original: |sin((t_ms − 10i)/200)|·(v_frame + i/10).
 */
export const wobble: Harmonic = ({ i, time, velocity }) =>
	harmonicGains.wobble *
	Math.abs(Math.sin(5 * time - i / 20)) *
	(velocity / 60 + i / 10);

/** The original three-harmonic stack. */
export const classicHarmonics: readonly Harmonic[] = [
	envelope,
	headThickening,
	wobble,
];

/**
 * Half-width at arc position ctx.i: the max of the harmonic sum over
 * `sampleSteps` consecutive indices (the original sampled 2 to smooth
 * aliasing between segments).
 */
export function widthAt(
	harmonics: readonly Harmonic[],
	ctx: HarmonicContext,
	sampleSteps = 2
): number {
	let max = 0;
	for (let j = 0; j < sampleSteps; j++) {
		const sampled: HarmonicContext = { ...ctx, i: ctx.i + j };
		let sum = 0;
		for (const harmonic of harmonics) {
			sum += harmonic(sampled);
		}
		max = Math.max(max, Math.abs(sum));
	}
	return max;
}
