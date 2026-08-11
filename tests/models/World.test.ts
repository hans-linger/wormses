import { describe, expect, it } from "vitest";
import { angleDelta } from "../../src/core/angles";
import { World } from "../../src/models/World";
import { defaultConfig } from "../../src/config/defaults";
import type { WorldSnapshot } from "../../src/contracts/snapshots";

/** Deepest interpenetration between any two distinct worms, 0 if none. */
function worstWormOverlap(snapshot: WorldSnapshot): number {
	let worst = 0;
	for (let a = 0; a < snapshot.worms.length; a++) {
		for (let b = a + 1; b < snapshot.worms.length; b++) {
			for (const sa of snapshot.worms[a]!.segments) {
				for (const sb of snapshot.worms[b]!.segments) {
					const gap =
						Math.hypot(sa.x - sb.x, sa.y - sb.y) - sa.halfWidth - sb.halfWidth;
					worst = Math.max(worst, -gap);
				}
			}
		}
	}
	return worst;
}

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

describe("World collision behavior over time", () => {
	// Worms are long deformable bodies whose tails must follow their heads,
	// so two crossing worms can press into each other for a moment before the
	// solver eases them apart. What must never happen is one passing through
	// another, or the contact growing without bound (a solver blow-up).
	const world = new World(defaultConfig({ seed: 5 }));
	let worstOverlap = 0;
	let contactSamples = 0;
	let samples = 0;
	let worstHeadStep = 0;
	const previousHeads = new Map<string, { x: number; y: number }>();

	for (let step = 0; step < 60 * 60; step++) {
		world.update(1 / 60);
		const frame = world.snapshot();
		for (const worm of frame.worms) {
			const head = worm.segments[0];
			if (head === undefined) continue;
			const previous = previousHeads.get(worm.id);
			if (previous !== undefined) {
				worstHeadStep = Math.max(
					worstHeadStep,
					Math.hypot(head.x - previous.x, head.y - previous.y)
				);
			}
			previousHeads.set(worm.id, { x: head.x, y: head.y });
		}
		if (step % 20 !== 0) continue;
		samples++;
		const overlap = worstWormOverlap(frame);
		if (overlap > 0.01) contactSamples++;
		worstOverlap = Math.max(worstOverlap, overlap);
	}

	it("never lets one worm pass through another", () => {
		// A pass-through would exceed a full body diameter of penetration.
		expect(worstOverlap).toBeLessThan(25);
	});

	it("leaves worms apart most of the time", () => {
		expect(contactSamples / samples).toBeLessThan(0.25);
	});

	it("stays numerically stable — no solver blow-ups", () => {
		// Runaway position correction used to fling heads hundreds of px per
		// tick into the world corners.
		expect(worstHeadStep).toBeLessThan(60);
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
				// The clamp for the link ending at p2 uses p2's half-width.
				const localRadius = p2.halfWidth * cfg.widthRadiusFactor;
				const allowed =
					localRadius > 0
						? Math.min(cfg.maxBendCap, cfg.spacing / localRadius)
						: cfg.maxBendCap;
				expect(bend).toBeLessThanOrEqual(allowed + 1e-6);
			}
		}
	});

	it("keeps distinct worms from overlapping in the final frame", () => {
		expect(worstWormOverlap(snapshot)).toBeLessThanOrEqual(0);
	});

	it("keeps worms from overlapping food they are not eating", () => {
		const targets = new Set(
			snapshot.worms.map((w) => w.targetId).filter((id) => id !== null)
		);
		let worstPenetration = 0;
		for (const worm of snapshot.worms) {
			for (const item of snapshot.food) {
				if (targets.has(item.id)) continue;
				for (const seg of worm.segments) {
					const gap =
						Math.hypot(seg.x - item.x, seg.y - item.y) -
						seg.halfWidth -
						item.radius;
					worstPenetration = Math.max(worstPenetration, -gap);
				}
			}
		}
		// Food radius pulses ±10% of its value after the tick's separation
		// pass, so contact can re-appear by that much before the next tick.
		expect(worstPenetration).toBeLessThanOrEqual(
			defaultConfig().food.valueMax * defaultConfig().food.pulseAmplitude
		);
	});

	it("never leaves food or eggs buried inside a worm", () => {
		let deepest = 0;
		for (const worm of snapshot.worms) {
			for (const seg of worm.segments) {
				for (const passive of [...snapshot.food, ...snapshot.eggs]) {
					const centreDistance = Math.hypot(
						seg.x - passive.x,
						seg.y - passive.y
					);
					// "Buried" = passive body's centre inside the worm's flesh.
					deepest = Math.max(deepest, seg.halfWidth - centreDistance);
				}
			}
		}
		expect(deepest).toBeLessThanOrEqual(0);
	});

	it("keeps every worm head strictly inside the world", () => {
		for (const worm of snapshot.worms) {
			const head = worm.segments[0]!;
			expect(head.x).toBeGreaterThanOrEqual(0);
			expect(head.x).toBeLessThanOrEqual(800);
			expect(head.y).toBeGreaterThanOrEqual(0);
			expect(head.y).toBeLessThanOrEqual(600);
		}
	});
});
