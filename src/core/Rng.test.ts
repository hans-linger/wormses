import { describe, expect, it } from "vitest";
import { Rng } from "./Rng";

describe("Rng", () => {
	it("is reproducible for the same seed", () => {
		const a = new Rng(42);
		const b = new Rng(42);
		expect([a.float(), a.float(), a.float()]).toEqual([
			b.float(),
			b.float(),
			b.float(),
		]);
	});

	it("differs across seeds", () => {
		expect(new Rng(1).float()).not.toBe(new Rng(2).float());
	});

	it("float() stays in [0, 1)", () => {
		const rng = new Rng(7);
		for (let i = 0; i < 1000; i++) {
			const v = rng.float();
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(1);
		}
	});

	it("range(a, b) stays within bounds", () => {
		const rng = new Rng(7);
		for (let i = 0; i < 1000; i++) {
			const v = rng.range(-3, 9);
			expect(v).toBeGreaterThanOrEqual(-3);
			expect(v).toBeLessThan(9);
		}
	});

	it("int(a, b) is inclusive on both ends and hits them", () => {
		const rng = new Rng(7);
		const seen = new Set<number>();
		for (let i = 0; i < 1000; i++) {
			const v = rng.int(1, 3);
			expect(Number.isInteger(v)).toBe(true);
			seen.add(v);
		}
		expect([...seen].sort()).toEqual([1, 2, 3]);
	});

	it("pick() selects only elements of the list", () => {
		const rng = new Rng(7);
		const items = ["a", "b", "c"] as const;
		for (let i = 0; i < 100; i++) {
			expect(items).toContain(rng.pick(items));
		}
	});
});
