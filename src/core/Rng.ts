/**
 * Seedable pseudo-random number generator (mulberry32).
 * Deterministic for a given seed — the simulation must use this instead of
 * Math.random() so runs are reproducible in tests.
 */
export class Rng {
	private state: number;

	constructor(seed: number) {
		this.state = seed >>> 0;
	}

	/** Uniform float in [0, 1). */
	float(): number {
		this.state = (this.state + 0x6d2b79f5) >>> 0;
		let t = this.state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}

	/** Uniform float in [min, max). */
	range(min: number, max: number): number {
		return min + this.float() * (max - min);
	}

	/** Uniform integer in [min, max], inclusive on both ends. */
	int(min: number, max: number): number {
		return min + Math.floor(this.float() * (max - min + 1));
	}

	pick<T>(items: readonly T[]): T {
		if (items.length === 0) {
			throw new Error("Rng.pick: empty list");
		}
		// Index is always in range here, so the assertion only strips the
		// `undefined` added by noUncheckedIndexedAccess.
		return items[this.int(0, items.length - 1)] as T;
	}
}
