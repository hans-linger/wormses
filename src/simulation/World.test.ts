import { describe, expect, it } from "vitest";
import { angleDelta } from "../core/angles";
import { World } from "./World";
import { defaultConfig } from "./WorldConfig";
import type { WorldSnapshot } from "./snapshots";

function allFinite(snapshot: WorldSnapshot): boolean {
	return snapshot.worms.every((w) =>
		w.segments.every(
			(s) =>
				Number.isFinite(s.x) &&
				Number.isFinite(s.y) &&
				Number.isFinite(s.halfWidth)
		)
	);
}

describe("World setup", () => {
	it("spawns the configured populations", () => {
		const world = new World(defaultConfig({ seed: 11 }));
		expect(world.wormCount).toBe(2);
		expect(world.eggCount).toBe(2);
		expect(world.foodCount).toBe(20);
	});

	it("is deterministic for a given seed", () => {
		const a = new World(defaultConfig({ seed: 7 }));
		const b = new World(defaultConfig({ seed: 7 }));
		for (let i = 0; i < 600; i++) {
			a.update(1 / 60);
			b.update(1 / 60);
		}
		expect(a.snapshot()).toEqual(b.snapshot());
	});
});

describe("World 60-second smoke run", () => {
	const world = new World(defaultConfig({ seed: 42 }));
	for (let i = 0; i < 60 * 60; i++) {
		world.update(1 / 60);
	}
	const snapshot = world.snapshot();

	it("keeps all coordinates finite", () => {
		expect(allFinite(snapshot)).toBe(true);
	});

	it("keeps the food supply constant (eaten food respawns)", () => {
		expect(world.foodCount).toBe(20);
	});

	it("keeps the ecosystem alive (worms or eggs present)", () => {
		expect(world.wormCount + world.eggCount).toBeGreaterThan(0);
	});

	it("respects the bend clamp on every worm (no self-intersecting turns)", () => {
		const cfg = defaultConfig().worm.spine;
		for (const worm of snapshot.worms) {
			for (let i = 2; i < worm.segments.length; i++) {
				const p0 = worm.segments[i - 2]!;
				const p1 = worm.segments[i - 1]!;
				const p2 = worm.segments[i]!;
				const a = Math.atan2(p1.y - p0.y, p1.x - p0.x);
				const b = Math.atan2(p2.y - p1.y, p2.x - p1.x);
				const bend = Math.abs(angleDelta(a, b));
				const localRadius = p1.halfWidth * cfg.widthRadiusFactor;
				const allowed =
					localRadius > 0
						? Math.min(cfg.maxBendCap, cfg.spacing / localRadius)
						: cfg.maxBendCap;
				expect(bend).toBeLessThanOrEqual(allowed + 1e-6);
			}
		}
	});

	it("keeps worms roughly inside the world", () => {
		for (const worm of snapshot.worms) {
			const head = worm.segments[0]!;
			expect(head.x).toBeGreaterThan(-50);
			expect(head.x).toBeLessThan(850);
			expect(head.y).toBeGreaterThan(-50);
			expect(head.y).toBeLessThan(650);
		}
	});
});
