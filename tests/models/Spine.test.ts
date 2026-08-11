import { describe, expect, it } from "vitest";
import { Vec2 } from "../../src/core/Vec2";
import { angleDelta } from "../../src/core/angles";
import { Spine } from "../../src/models/Spine";

const params = {
	spacing: 5,
	bendTolerance: 0.4,
	widthRadiusFactor: 1.2,
	maxBendCap: Math.PI / 3,
};

describe("Spine construction", () => {
	it("lays segments behind the head along -heading at rest spacing", () => {
		const spine = new Spine(new Vec2(100, 100), 0, 4, params);
		expect(spine.segments).toHaveLength(4);
		expect(spine.segments[0]!.position).toEqual(new Vec2(100, 100));
		expect(spine.segments[1]!.position.x).toBeCloseTo(95, 10);
		expect(spine.segments[1]!.position.y).toBeCloseTo(100, 10);
		expect(spine.segments[3]!.position.x).toBeCloseTo(85, 10);
	});
});

describe("Spine follow", () => {
	it("keeps link distance at rest spacing when the head inches forward", () => {
		const spine = new Spine(new Vec2(0, 0), 0, 5, params);
		for (let k = 0; k < 100; k++) {
			spine.setHead(new Vec2(k * 0.5, 0), 0);
			spine.follow();
		}
		for (let i = 1; i < 5; i++) {
			const d = spine.segments[i]!.position.distanceTo(
				spine.segments[i - 1]!.position
			);
			expect(d).toBeGreaterThanOrEqual(params.spacing * 0.6 - 1e-9);
			expect(d).toBeLessThanOrEqual(params.spacing * 1.4 + 1e-9);
		}
	});

	it("clamps stretched links (teleported head) like the original: min(7,d) shrunk to 6", () => {
		const spine = new Spine(new Vec2(0, 0), 0, 2, params);
		spine.setHead(new Vec2(100, 0), 0);
		spine.follow();
		const d = spine.segments[1]!.position.distanceTo(
			spine.segments[0]!.position
		);
		// raw 95 → clamp to 5*1.4=7 → shrink by 0.5*|7-5| → 6
		expect(d).toBeCloseTo(6, 10);
	});

	it("does not produce NaN when the head is stationary", () => {
		const spine = new Spine(new Vec2(10, 10), 1, 6, params);
		for (let k = 0; k < 10; k++) {
			spine.setHead(new Vec2(10, 10), 1);
			spine.follow();
		}
		for (const seg of spine.segments) {
			expect(Number.isFinite(seg.position.x)).toBe(true);
			expect(Number.isFinite(seg.position.y)).toBe(true);
		}
	});
});

describe("Spine bend clamp (self-intersection guard)", () => {
	function maxObservedBend(spine: Spine): number {
		let max = 0;
		const segs = spine.segments;
		for (let i = 2; i < segs.length; i++) {
			const a = segs[i - 1]!.position.sub(segs[i - 2]!.position).angle();
			const b = segs[i]!.position.sub(segs[i - 1]!.position).angle();
			max = Math.max(max, Math.abs(angleDelta(a, b)));
		}
		return max;
	}

	it("limits per-joint bend to spacing / (halfWidth * factor) for fat worms", () => {
		const spine = new Spine(new Vec2(0, 0), 0, 12, params);
		const halfWidth = 10;
		for (const seg of spine.segments) seg.halfWidth = halfWidth;
		const expectedMaxBend = Math.min(
			params.maxBendCap,
			params.spacing / (halfWidth * params.widthRadiusFactor)
		);
		// Drag the head through a violent U-turn
		let heading = 0;
		let pos = new Vec2(0, 0);
		for (let k = 0; k < 60; k++) {
			heading += 0.3;
			pos = pos.add(Vec2.fromAngle(heading, 3));
			spine.setHead(pos, heading);
			spine.follow();
		}
		expect(maxObservedBend(spine)).toBeLessThanOrEqual(expectedMaxBend + 1e-9);
	});

	it("never exceeds the absolute cap even for zero-width spines", () => {
		const spine = new Spine(new Vec2(0, 0), 0, 12, params);
		let heading = 0;
		let pos = new Vec2(0, 0);
		for (let k = 0; k < 60; k++) {
			heading += 0.9;
			pos = pos.add(Vec2.fromAngle(heading, 4));
			spine.setHead(pos, heading);
			spine.follow();
		}
		expect(maxObservedBend(spine)).toBeLessThanOrEqual(
			params.maxBendCap + 1e-9
		);
	});
});

describe("Spine contact resolution", () => {
	it("bends links around obstacles without changing link length", () => {
		const spine = new Spine(new Vec2(0, 0), 0, 8, params);
		for (const seg of spine.segments) seg.halfWidth = 2;
		// Resolver shoves every segment 3px up; link lengths must survive.
		spine.follow((position) => position.add(new Vec2(0, 3)));
		for (let i = 1; i < spine.segments.length; i++) {
			const d = spine.segments[i]!.position.distanceTo(
				spine.segments[i - 1]!.position
			);
			expect(d).toBeGreaterThanOrEqual(params.spacing * 0.6 - 1e-9);
			expect(d).toBeLessThanOrEqual(params.spacing * 1.4 + 1e-9);
		}
	});

	it("deflects the body toward the pushed side", () => {
		const spine = new Spine(new Vec2(0, 0), 0, 6, params);
		for (const seg of spine.segments) seg.halfWidth = 2;
		spine.follow((position) => position.add(new Vec2(0, 2)));
		// Every trailing segment ends up above the original straight line.
		expect(spine.segments[1]!.position.y).toBeGreaterThan(0);
	});

	it("still honors the bend clamp while resolving contacts", () => {
		const spine = new Spine(new Vec2(0, 0), 0, 10, params);
		for (const seg of spine.segments) seg.halfWidth = 10;
		const maxBend = Math.min(
			params.maxBendCap,
			params.spacing / (10 * params.widthRadiusFactor)
		);
		// A violent sideways shove must not fold the body.
		spine.follow((position) => position.add(new Vec2(0, 50)));
		for (let i = 2; i < spine.segments.length; i++) {
			const a = spine.segments[i - 1]!.position
				.sub(spine.segments[i - 2]!.position)
				.angle();
			const b = spine.segments[i]!.position
				.sub(spine.segments[i - 1]!.position)
				.angle();
			expect(Math.abs(angleDelta(a, b))).toBeLessThanOrEqual(maxBend + 1e-9);
		}
	});
});

describe("Spine grow", () => {
	it("appends segments at the tail, continuing the last link direction", () => {
		const spine = new Spine(new Vec2(0, 0), 0, 3, params);
		spine.grow(2);
		expect(spine.segments).toHaveLength(5);
		expect(spine.segments[4]!.position.x).toBeCloseTo(-20, 6);
	});
});
