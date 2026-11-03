import { describe, expect, it } from "vitest";
import { Vec2 } from "../../src/core/Vec2";
import { angleDelta } from "../../src/core/angles";
import type { CircleObstacle } from "../../src/contracts/collision";
import { findNearestThreat } from "../../src/systems/collision";
import {
	combineSeekAvoid,
	maxTurnRate,
	separationOffset,
} from "../../src/systems/steering";

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

describe("separationOffset", () => {
	const neighbor = (x: number, y: number, radius = 10): CircleObstacle => ({
		center: new Vec2(x, y),
		radius,
		kind: "worm",
		ownerId: "other",
	});
	const at = new Vec2(0, 0);

	it("is zero with nobody around", () => {
		expect(separationOffset(at, 0, [], 5, 30, 1)).toBe(0);
	});

	it("is zero for neighbours beyond range", () => {
		expect(separationOffset(at, 0, [neighbor(500, 0)], 5, 30, 1)).toBe(0);
	});

	it("turns away from a neighbour on the left", () => {
		// Heading +x, neighbour to the left (+y): push should be negative.
		expect(separationOffset(at, 0, [neighbor(0, 20)], 5, 30, 1)).toBeLessThan(0);
	});

	it("turns away from a neighbour on the right", () => {
		expect(
			separationOffset(at, 0, [neighbor(0, -20)], 5, 30, 1)
		).toBeGreaterThan(0);
	});

	it("ignores a neighbour dead ahead — that is the feeler's job", () => {
		// Pushing backwards gives no lateral component, so no steering.
		expect(Math.abs(separationOffset(at, 0, [neighbor(20, 0)], 5, 30, 1))).
			toBeLessThan(1e-9);
	});

	it("responds smoothly, not in jumps, as a neighbour swings around", () => {
		// A bang-bang controller flips sign at full strength and oscillates.
		let previous = separationOffset(at, 0, [neighbor(20, 0)], 5, 40, 1);
		for (let deg = 5; deg <= 180; deg += 5) {
			const a = (deg * Math.PI) / 180;
			const value = separationOffset(
				at,
				0,
				[neighbor(Math.cos(a) * 20, Math.sin(a) * 20)],
				5,
				40,
				1
			);
			expect(Math.abs(value - previous)).toBeLessThan(0.25);
			previous = value;
		}
	});

	it("pushes harder the closer the neighbour is", () => {
		const far = Math.abs(separationOffset(at, 0, [neighbor(0, 28)], 5, 40, 1));
		const near = Math.abs(separationOffset(at, 0, [neighbor(0, 17)], 5, 40, 1));
		expect(near).toBeGreaterThan(far);
	});

	it("never exceeds the configured strength", () => {
		const crowd = [neighbor(0, 16), neighbor(2, 17), neighbor(-2, 16)];
		expect(Math.abs(separationOffset(at, 0, crowd, 5, 40, 0.8))).
			toBeLessThanOrEqual(0.8 + 1e-9);
	});
});
