import { describe, expect, it } from "vitest";
import { Vec2 } from "./Vec2";

describe("Vec2", () => {
	it("adds and subtracts", () => {
		const a = new Vec2(1, 2);
		const b = new Vec2(3, -1);
		expect(a.add(b)).toEqual(new Vec2(4, 1));
		expect(a.sub(b)).toEqual(new Vec2(-2, 3));
	});

	it("scales and computes length", () => {
		expect(new Vec2(3, 4).length()).toBe(5);
		expect(new Vec2(3, 4).scale(2)).toEqual(new Vec2(6, 8));
	});

	it("normalizes, guarding the zero vector", () => {
		expect(new Vec2(0, 5).normalize()).toEqual(new Vec2(0, 1));
		expect(new Vec2(0, 0).normalize()).toEqual(new Vec2(0, 0));
	});

	it("measures distance", () => {
		expect(new Vec2(1, 1).distanceTo(new Vec2(4, 5))).toBe(5);
	});

	it("computes dot and cross products", () => {
		const a = new Vec2(1, 2);
		const b = new Vec2(3, 4);
		expect(a.dot(b)).toBe(11);
		expect(a.cross(b)).toBe(-2);
	});

	it("builds a unit vector from a heading angle and reads it back", () => {
		const v = Vec2.fromAngle(Math.PI / 2);
		expect(v.x).toBeCloseTo(0, 12);
		expect(v.y).toBeCloseTo(1, 12);
		expect(v.angle()).toBeCloseTo(Math.PI / 2, 12);
	});

	it("rotates by 90 degrees via perp", () => {
		const p = new Vec2(1, 0).perp();
		expect(p.x).toBeCloseTo(0, 12);
		expect(p.y).toBeCloseTo(1, 12);
	});

	it("lerps", () => {
		expect(new Vec2(0, 0).lerp(new Vec2(10, -10), 0.25)).toEqual(
			new Vec2(2.5, -2.5)
		);
	});
});
