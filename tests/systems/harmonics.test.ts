import { describe, expect, it } from "vitest";
import type { HarmonicContext } from "../../src/contracts/harmonics";
import {
	classicHarmonics,
	envelope,
	headThickening,
	widthAt,
	wobble,
} from "../../src/systems/harmonics";

function ctx(overrides: Partial<HarmonicContext> = {}): HarmonicContext {
	return {
		i: 0,
		length: 20,
		baseWidth: 8,
		velocity: 0,
		time: 0,
		...overrides,
	};
}

describe("envelope harmonic", () => {
	it("is zero at both ends of the body", () => {
		expect(envelope(ctx({ i: 0 }))).toBeCloseTo(0, 12);
		expect(envelope(ctx({ i: 20 }))).toBeCloseTo(0, 12);
	});

	it("peaks at baseWidth mid-body", () => {
		expect(envelope(ctx({ i: 10 }))).toBeCloseTo(8, 12);
	});
});

describe("headThickening harmonic", () => {
	it("matches (i + L/10)^(1.4 - i/L) at the head", () => {
		// i=0, L=20: (0 + 2)^1.4
		expect(headThickening(ctx({ i: 0 }))).toBeCloseTo(Math.pow(2, 1.4), 12);
	});

	it("decays toward the tail exponent", () => {
		// i=20, L=20: (22)^0.4
		expect(headThickening(ctx({ i: 20 }))).toBeCloseTo(Math.pow(22, 0.4), 12);
	});
});

describe("wobble harmonic", () => {
	it("is zero at t=0, i=0", () => {
		expect(wobble(ctx({ velocity: 120 }))).toBeCloseTo(0, 12);
	});

	it("travels along the body: amplitude scales with velocity and index", () => {
		// Phase = 5t - i/20; choose t so phase = PI/2 at i=0.
		const t = Math.PI / 10;
		// velocity 60 px/s ≙ 1 px/frame in the old 60fps code
		expect(wobble(ctx({ time: t, velocity: 60 }))).toBeCloseTo(1, 12);
		// At i=10 amplitude gains i/10 = 1; phase shifts by -0.5
		const expected = Math.abs(Math.sin(5 * t - 0.5)) * 2;
		expect(wobble(ctx({ time: t, velocity: 60, i: 10 }))).toBeCloseTo(
			expected,
			12
		);
	});
});

describe("widthAt", () => {
	it("sums all harmonics", () => {
		const c = ctx({ i: 10, time: 0.4, velocity: 60 });
		const sum = envelope(c) + headThickening(c) + wobble(c);
		expect(widthAt([envelope, headThickening, wobble], c, 1)).toBeCloseTo(
			sum,
			12
		);
	});

	it("takes the max over consecutive sample steps", () => {
		const ramp = (c: HarmonicContext): number => c.i;
		expect(widthAt([ramp], ctx({ i: 3 }), 2)).toBe(4);
		expect(widthAt([ramp], ctx({ i: 3 }), 1)).toBe(3);
	});

	it("classicHarmonics is the three-part stack", () => {
		expect(classicHarmonics).toHaveLength(3);
	});
});
