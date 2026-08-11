import { describe, expect, it } from "vitest";
import { Vec2 } from "../../src/core/Vec2";
import type { CircleObstacle } from "../../src/contracts/collision";
import type { PhysicsConfig, SpineParams } from "../../src/contracts/config";
import {
	isStructuralNeighbor,
	ObstacleGrid,
	resolveContacts,
} from "../../src/systems/collision";
import { defaultConfig } from "../../src/config/defaults";

const physics: PhysicsConfig = defaultConfig().physics;
const spine: SpineParams = defaultConfig().worm.spine;

function grid(obstacles: CircleObstacle[]): ObstacleGrid {
	return new ObstacleGrid(obstacles, physics.gridCellSize);
}

function circle(
	x: number,
	y: number,
	radius: number,
	ownerId = "o"
): CircleObstacle {
	return { center: new Vec2(x, y), radius, ownerId, kind: "egg" };
}

const acceptAll = (): boolean => true;

describe("ObstacleGrid", () => {
	it("finds obstacles near a query point", () => {
		const g = grid([circle(10, 10, 5, "near"), circle(500, 500, 5, "far")]);
		const found = g.query(new Vec2(12, 12), 5).map((o) => o.ownerId);
		expect(found).toContain("near");
		expect(found).not.toContain("far");
	});

	it("finds obstacles that straddle a cell boundary", () => {
		// cell size 40: this obstacle sits in a different cell than the query
		const g = grid([circle(41, 41, 20)]);
		expect(g.query(new Vec2(30, 30), 10)).toHaveLength(1);
	});
});

describe("resolveContacts", () => {
	it("leaves a non-overlapping circle untouched", () => {
		const at = new Vec2(100, 100);
		expect(resolveContacts(at, 5, grid([circle(200, 200, 10)]), acceptAll, physics)).toBe(at);
	});

	it("pushes an overlapping circle along the contact normal", () => {
		const result = resolveContacts(
			new Vec2(105, 100),
			10,
			grid([circle(100, 100, 20)]),
			acceptAll,
			physics
		);
		// pushed along +x, the shortest way out
		expect(result.y).toBeCloseTo(100, 6);
		expect(result.x).toBeGreaterThan(105);
	});

	it("moves at most maxCorrection per iteration, so deep overlaps ease apart", () => {
		const obstacles = grid([circle(100, 100, 20)]);
		const budget = physics.maxCorrection * physics.iterations;
		const once = resolveContacts(new Vec2(105, 100), 10, obstacles, acceptAll, physics);
		expect(once.distanceTo(new Vec2(105, 100))).toBeLessThanOrEqual(budget + 1e-9);
	});

	it("fully separates after enough repeated passes", () => {
		const obstacles = grid([circle(100, 100, 20)]);
		let position = new Vec2(105, 100);
		for (let tick = 0; tick < 20; tick++) {
			position = resolveContacts(position, 10, obstacles, acceptAll, physics);
		}
		expect(position.distanceTo(new Vec2(100, 100))).toBeGreaterThanOrEqual(30);
	});

	it("escapes sideways when sandwiched between two opposing bodies", () => {
		// Opposing corrections cancel exactly; without an unjam rule the
		// circle would sit wedged forever.
		const above = new Vec2(100, 90);
		const below = new Vec2(100, 110);
		const start = new Vec2(100, 100);
		const result = resolveContacts(
			start,
			8,
			grid([circle(100, 90, 10, "above"), circle(100, 110, 10, "below")]),
			acceptAll,
			physics
		);
		expect(result).not.toEqual(start);
		expect(Math.abs(result.x - 100)).toBeGreaterThan(5);
		expect(result.distanceTo(above)).toBeGreaterThan(start.distanceTo(above));
		expect(result.distanceTo(below)).toBeGreaterThan(start.distanceTo(below));
	});

	it("resolves concentric circles deterministically instead of dividing by zero", () => {
		const obstacles = [circle(100, 100, 10)];
		const a = resolveContacts(
			new Vec2(100, 100),
			5,
			grid(obstacles),
			acceptAll,
			physics
		);
		const b = resolveContacts(
			new Vec2(100, 100),
			5,
			grid(obstacles),
			acceptAll,
			physics
		);
		expect(Number.isFinite(a.x)).toBe(true);
		expect(Number.isFinite(a.y)).toBe(true);
		expect(a).toEqual(b);
		expect(a.distanceTo(new Vec2(100, 100))).toBeGreaterThan(0);
	});

	it("ignores obstacles rejected by the filter", () => {
		const at = new Vec2(105, 100);
		const result = resolveContacts(
			at,
			10,
			grid([circle(100, 100, 20, "skip")]),
			(o) => o.ownerId !== "skip",
			physics
		);
		expect(result).toBe(at);
	});
});

describe("isStructuralNeighbor", () => {
	const own = (index: number, radius: number): CircleObstacle => ({
		center: new Vec2(0, 0),
		radius,
		ownerId: "w",
		kind: "worm",
		segmentIndex: index,
	});

	it("treats nearby segments of the same body as unavoidable overlaps", () => {
		expect(isStructuralNeighbor(10, own(12, 8), 8, spine, physics)).toBe(true);
	});

	it("allows distant segments of the same body to collide", () => {
		expect(isStructuralNeighbor(10, own(40, 4), 4, spine, physics)).toBe(false);
	});

	it("scales the exclusion window with body width", () => {
		// Fat segments (radius 20, spacing 5) overlap up to 8 indices apart.
		expect(isStructuralNeighbor(10, own(17, 20), 20, spine, physics)).toBe(true);
		expect(isStructuralNeighbor(10, own(40, 20), 20, spine, physics)).toBe(false);
	});
});
