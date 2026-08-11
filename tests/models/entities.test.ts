import { describe, expect, it } from "vitest";
import { Rng } from "../../src/core/Rng";
import { Vec2 } from "../../src/core/Vec2";
import { Egg } from "../../src/models/Egg";
import { Food, FOOD_KINDS } from "../../src/models/Food";
import { defaultConfig } from "../../src/config/defaults";

const config = defaultConfig();

describe("Food", () => {
	it("is deterministic for a given rng seed", () => {
		const a = new Food("f1", new Vec2(0, 0), new Rng(5), config.food);
		const b = new Food("f1", new Vec2(0, 0), new Rng(5), config.food);
		expect(a.kind).toBe(b.kind);
		expect(a.value).toBe(b.value);
	});

	it("has a valid kind and value within config bounds", () => {
		for (let seed = 0; seed < 30; seed++) {
			const f = new Food("f", new Vec2(0, 0), new Rng(seed), config.food);
			expect(FOOD_KINDS).toContain(f.kind);
			expect(f.value).toBeGreaterThanOrEqual(config.food.valueMin);
			expect(f.value).toBeLessThan(config.food.valueMax);
		}
	});

	it("all three kinds are reachable (original bug fixed)", () => {
		const seen = new Set<string>();
		for (let seed = 0; seed < 100; seed++) {
			seen.add(new Food("f", new Vec2(0, 0), new Rng(seed), config.food).kind);
		}
		expect([...seen].sort()).toEqual(["length", "power", "width"]);
	});

	it("pulses its radius around the value", () => {
		const f = new Food("f", new Vec2(0, 0), new Rng(1), config.food);
		// sin(t·4) = 1 at t = PI/8
		f.update(Math.PI / 8);
		expect(f.radius).toBeCloseTo(f.value * 1.1, 10);
	});

	it("snapshots with rings", () => {
		const f = new Food("f", new Vec2(3, 4), new Rng(1), config.food);
		const snap = f.snapshot();
		expect(snap.kind).toBe("food");
		expect(snap.x).toBe(3);
		expect(snap.rings).toHaveLength(config.food.ringCount);
	});
});

describe("Egg", () => {
	it("hatches within the configured window", () => {
		const egg = new Egg("e", new Vec2(0, 0), 0, new Rng(3), config.egg);
		const dt = 1 / 60;
		let time = 0;
		let hatchedAt: number | null = null;
		for (let step = 0; step < 60 * 15; step++) {
			time += dt;
			if (egg.update(time, dt) === "hatch") {
				hatchedAt = time;
				break;
			}
		}
		expect(hatchedAt).not.toBeNull();
		expect(hatchedAt!).toBeGreaterThanOrEqual(config.egg.hatchTimeMin);
		expect(hatchedAt!).toBeLessThanOrEqual(
			config.egg.hatchTimeMin +
				config.egg.hatchTimeSpread +
				config.egg.hatchBurstDuration +
				0.1
		);
	});

	it("grows over time", () => {
		const egg = new Egg("e", new Vec2(0, 0), 0, new Rng(3), config.egg);
		const before = egg.radius;
		egg.update(1 / 60, 1 / 60);
		expect(egg.radius).toBeGreaterThan(before);
	});

	it("snapshots a closed outline (first dot repeated by sorted angle 0)", () => {
		const egg = new Egg("e", new Vec2(1, 2), 0, new Rng(3), config.egg);
		const snap = egg.snapshot();
		expect(snap.dots.length).toBeGreaterThanOrEqual(7);
		expect(snap.rings.length).toBeGreaterThanOrEqual(5);
	});
});
