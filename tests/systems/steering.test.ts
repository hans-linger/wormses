import { describe, expect, it } from "vitest";
import { Vec2 } from "../../src/core/Vec2";
import { angleDelta } from "../../src/core/angles";
import { findNearestThreat } from "../../src/systems/collision";
import { combineSeekAvoid, maxTurnRate } from "../../src/systems/steering";

describe("maxTurnRate", () => {
	it("limits angular velocity so turning radius >= min radius", () => {
		// speed 120 px/s, min radius 60 px -> 2 rad/s
		expect(maxTurnRate(120, 60, 10)).toBeCloseTo(2, 12);
	});

	it("caps at the absolute maximum", () => {
		expect(maxTurnRate(120, 1, 2.5)).toBe(2.5);
	});

	it("falls back to the cap for zero radius", () => {
		expect(maxTurnRate(120, 0, 2.5)).toBe(2.5);
	});
});

describe("combineSeekAvoid", () => {
	const east = new Vec2(1, 0);

	it("returns the seek heading when there is no threat", () => {
		expect(combineSeekAvoid(0.5, null, 100, 1)).toBe(0.5);
	});

	it("pushes heading away from a left-side threat (turns right)", () => {
		const threat = findNearestThreat(
			new Vec2(0, 0),
			east,
			100,
			2,
			[{ center: new Vec2(40, 3), radius: 5, ownerId: "o", kind: "egg" }]
		);
		const result = combineSeekAvoid(0, threat, 100, 1);
		expect(angleDelta(0, result)).toBeLessThan(0);
	});

	it("pushes heading away from a right-side threat (turns left)", () => {
		const threat = findNearestThreat(
			new Vec2(0, 0),
			east,
			100,
			2,
			[{ center: new Vec2(40, -3), radius: 5, ownerId: "o", kind: "egg" }]
		);
		const result = combineSeekAvoid(0, threat, 100, 1);
		expect(angleDelta(0, result)).toBeGreaterThan(0);
	});

	it("steers harder for nearer threats", () => {
		const near = findNearestThreat(new Vec2(0, 0), east, 100, 2, [
			{ center: new Vec2(20, 3), radius: 5, ownerId: "o", kind: "egg" },
		]);
		const far = findNearestThreat(new Vec2(0, 0), east, 100, 2, [
			{ center: new Vec2(90, 3), radius: 5, ownerId: "o", kind: "egg" },
		]);
		const nearPush = Math.abs(angleDelta(0, combineSeekAvoid(0, near, 100, 1)));
		const farPush = Math.abs(angleDelta(0, combineSeekAvoid(0, far, 100, 1)));
		expect(nearPush).toBeGreaterThan(farPush);
	});
});
