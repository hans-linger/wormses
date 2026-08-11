import { describe, expect, it } from "vitest";
import { angleDelta, normalizeAngle, turnToward } from "../../src/core/angles";

describe("normalizeAngle", () => {
	it("keeps angles already in (-PI, PI]", () => {
		expect(normalizeAngle(0)).toBe(0);
		expect(normalizeAngle(Math.PI)).toBeCloseTo(Math.PI, 12);
		expect(normalizeAngle(-3)).toBeCloseTo(-3, 12);
	});

	it("wraps angles outside the range", () => {
		expect(normalizeAngle(Math.PI * 2)).toBeCloseTo(0, 12);
		expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(Math.PI, 12);
		expect(normalizeAngle(-Math.PI * 2.5)).toBeCloseTo(-Math.PI / 2, 12);
	});
});

describe("angleDelta", () => {
	it("returns the signed shortest rotation from a to b", () => {
		expect(angleDelta(0, Math.PI / 4)).toBeCloseTo(Math.PI / 4, 12);
		expect(angleDelta(Math.PI / 4, 0)).toBeCloseTo(-Math.PI / 4, 12);
	});

	it("takes the short way across the ±PI seam", () => {
		const a = Math.PI - 0.1;
		const b = -Math.PI + 0.1;
		expect(angleDelta(a, b)).toBeCloseTo(0.2, 12);
		expect(angleDelta(b, a)).toBeCloseTo(-0.2, 12);
	});
});

describe("turnToward", () => {
	it("snaps to target when within max delta", () => {
		expect(turnToward(0, 0.05, 0.1)).toBeCloseTo(0.05, 12);
	});

	it("moves by exactly max delta when target is farther", () => {
		expect(turnToward(0, 1, 0.1)).toBeCloseTo(0.1, 12);
		expect(turnToward(0, -1, 0.1)).toBeCloseTo(-0.1, 12);
	});

	it("turns across the ±PI seam in the short direction", () => {
		const from = Math.PI - 0.05;
		const to = -Math.PI + 0.05;
		const result = turnToward(from, to, 0.02);
		expect(angleDelta(from, result)).toBeCloseTo(0.02, 12);
	});
});
