import { describe, expect, it } from "vitest";
import { Vec2 } from "../../src/core/Vec2";
import type { CircleObstacle } from "../../src/contracts/collision";
import {
	findNearestThreat,
	spineObstacles,
} from "../../src/systems/collision";
import { Spine } from "../../src/models/Spine";

function circle(
	x: number,
	y: number,
	radius: number,
	ownerId = "o"
): CircleObstacle {
	return { center: new Vec2(x, y), radius, ownerId, kind: "egg" };
}

const origin = new Vec2(0, 0);
const east = new Vec2(1, 0);

describe("findNearestThreat", () => {
	it("detects an obstacle dead ahead within look-ahead", () => {
		const threat = findNearestThreat(origin, east, 100, 2, [circle(50, 0, 5)]);
		expect(threat).not.toBeNull();
		expect(threat!.distance).toBeCloseTo(50, 10);
		expect(threat!.overlap).toBeCloseTo(7, 10);
	});

	it("ignores obstacles behind the origin", () => {
		expect(findNearestThreat(origin, east, 100, 2, [circle(-30, 0, 5)])).toBeNull();
	});

	it("ignores obstacles beyond look-ahead", () => {
		expect(findNearestThreat(origin, east, 100, 2, [circle(200, 0, 5)])).toBeNull();
	});

	it("ignores obstacles laterally clear of the inflated corridor", () => {
		expect(findNearestThreat(origin, east, 100, 2, [circle(50, 20, 5)])).toBeNull();
	});

	it("reports the side the obstacle is on", () => {
		const left = findNearestThreat(origin, east, 100, 2, [circle(50, 3, 5)]);
		const right = findNearestThreat(origin, east, 100, 2, [circle(50, -3, 5)]);
		expect(left!.side).toBe(1);
		expect(right!.side).toBe(-1);
	});

	it("returns the nearest of several threats", () => {
		const threat = findNearestThreat(origin, east, 100, 2, [
			circle(80, 0, 5, "far"),
			circle(40, 0, 5, "near"),
		]);
		expect(threat!.obstacle.ownerId).toBe("near");
	});

	it("honors the accept filter", () => {
		const threat = findNearestThreat(
			origin,
			east,
			100,
			2,
			[circle(40, 0, 5, "self")],
			(o) => o.ownerId !== "self"
		);
		expect(threat).toBeNull();
	});
});

describe("spineObstacles", () => {
	it("emits one circle per segment with the segment half-width", () => {
		const spine = new Spine(new Vec2(10, 20), 0, 3, {
			spacing: 5,
			bendTolerance: 0.4,
			widthRadiusFactor: 1.2,
			maxBendCap: Math.PI / 3,
		});
		for (const seg of spine.segments) seg.halfWidth = 4;
		const obstacles = spineObstacles(spine.segments, "worm_1");
		expect(obstacles).toHaveLength(3);
		expect(obstacles[0]!.center).toEqual(new Vec2(10, 20));
		expect(obstacles[0]!.radius).toBe(4);
		expect(obstacles.every((o) => o.ownerId === "worm_1")).toBe(true);
	});
});
