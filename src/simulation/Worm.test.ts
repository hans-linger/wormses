import { describe, expect, it } from "vitest";
import { Rng } from "../core/Rng";
import { Vec2 } from "../core/Vec2";
import { angleDelta } from "../core/angles";
import type { CircleObstacle } from "./collision";
import { Worm, type WormContext } from "./Worm";
import { defaultConfig } from "./WorldConfig";

const config = defaultConfig();

function makeContext(overrides: Partial<WormContext> = {}): WormContext {
	return {
		time: 0,
		dt: 1 / 60,
		rng: new Rng(9),
		worldWidth: 800,
		worldHeight: 600,
		edgeMargin: 100,
		food: [],
		obstacles: [],
		...overrides,
	};
}

function makeWorm(position = new Vec2(400, 300), heading = 0): Worm {
	return new Worm("worm_t", position, heading, new Rng(4), config.worm);
}

describe("Worm seeking", () => {
	it("closes distance to its food target over time", () => {
		const worm = makeWorm(new Vec2(200, 300));
		const foodPos = new Vec2(500, 300);
		const start = worm.headPosition.distanceTo(foodPos);
		let time = 0;
		for (let step = 0; step < 240; step++) {
			time += 1 / 60;
			worm.update(
				makeContext({ time, food: [{ id: "f1", position: foodPos }] })
			);
		}
		expect(worm.headPosition.distanceTo(foodPos)).toBeLessThan(start / 2);
	});

	it("emits an eat intent within eat radius", () => {
		const worm = makeWorm(new Vec2(400, 300));
		const intent = worm.update(
			makeContext({
				food: [{ id: "f1", position: new Vec2(405, 300) }],
			})
		);
		expect(intent).toEqual({ type: "eat", foodId: "f1" });
	});

	it("caps heading change per tick at turnRateCap·dt", () => {
		const worm = makeWorm(new Vec2(400, 300), 0);
		// Food directly behind: the worm wants a U-turn.
		const food = [{ id: "f1", position: new Vec2(100, 300) }];
		let prevHeading = worm.snapshot().segments[0]!.heading;
		let time = 0;
		for (let step = 0; step < 60; step++) {
			time += 1 / 60;
			worm.update(makeContext({ time, food }));
			const heading = worm.snapshot().segments[0]!.heading;
			const delta = Math.abs(angleDelta(prevHeading, heading));
			expect(delta).toBeLessThanOrEqual(
				(config.worm.turnRateCap * 1) / 60 + 1e-9
			);
			prevHeading = heading;
		}
	});
});

describe("Worm growth and death", () => {
	it("grows segments after eating length food", () => {
		const worm = makeWorm();
		const before = worm.snapshot().length;
		worm.applyFood("length", 20);
		let time = 0;
		for (let step = 0; step < 10; step++) {
			time += 1 / 60;
			worm.update(
				makeContext({ time, food: [{ id: "f", position: new Vec2(700, 500) }] })
			);
		}
		expect(worm.snapshot().length).toBe(before + 10);
	});

	it("width and power food grow the respective stats", () => {
		const worm = makeWorm();
		const { baseWidth, maxSpeed } = worm;
		worm.applyFood("width", 12);
		worm.applyFood("power", 16);
		expect(worm.baseWidth).toBeCloseTo(baseWidth + 4, 10);
		expect(worm.maxSpeed).toBeCloseTo(maxSpeed + 30, 10);
	});

	it("starts dying past max length and expires after dyingDuration", () => {
		const worm = makeWorm();
		// +200 segments — beyond the worst-case maxLength of ~148
		worm.applyFood("length", 400);
		const food = [{ id: "f", position: new Vec2(700, 500) }];
		let time = 0;
		worm.update(makeContext({ time, food }));
		expect(worm.state).toBe("dying");
		let expired = false;
		for (let step = 0; step < 60 * 4; step++) {
			time += 1 / 60;
			const intent = worm.update(makeContext({ time, food }));
			if (intent?.type === "expired") {
				expired = true;
				expect(time).toBeGreaterThan(config.worm.dyingDuration);
				break;
			}
		}
		expect(expired).toBe(true);
	});
});

describe("Worm avoidance", () => {
	it("steers around an obstacle between it and the target", () => {
		const obstacle: CircleObstacle = {
			center: new Vec2(400, 300),
			radius: 25,
			ownerId: "egg_big",
		};
		const worm = makeWorm(new Vec2(200, 300), 0);
		const food = [{ id: "f", position: new Vec2(600, 300) }];
		let minClearance = Infinity;
		let time = 0;
		for (let step = 0; step < 60 * 8; step++) {
			time += 1 / 60;
			worm.update(makeContext({ time, food, obstacles: [obstacle] }));
			minClearance = Math.min(
				minClearance,
				worm.headPosition.distanceTo(obstacle.center)
			);
			if (worm.headPosition.distanceTo(food[0]!.position) < 15) break;
		}
		// Head never plows through the middle of the obstacle.
		expect(minClearance).toBeGreaterThan(obstacle.radius * 0.75);
	});

	it("ignores its own near-head segments but not a straight-ahead foreign body", () => {
		const worm = makeWorm(new Vec2(200, 300), 0);
		const ownCircle: CircleObstacle = {
			center: new Vec2(210, 300),
			radius: 10,
			ownerId: "worm_t",
			segmentIndex: 2,
		};
		// Own near-head circle alone: no steering deflection expected.
		const before = worm.snapshot().segments[0]!.heading;
		worm.update(
			makeContext({
				food: [{ id: "f", position: new Vec2(600, 300) }],
				obstacles: [ownCircle],
			})
		);
		const after = worm.snapshot().segments[0]!.heading;
		expect(Math.abs(angleDelta(before, after))).toBeLessThan(1e-6);
	});
});
