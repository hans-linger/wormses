import type { Rng } from "../core/Rng";
import type { Vec2 } from "../core/Vec2";
import type { EggSnapshot } from "./snapshots";
import type { EggConfig } from "./WorldConfig";

export type EggUpdateResult = "none" | "hatch";

/**
 * An egg: concentric wobbly polygons that slowly grow, then pop into a worm.
 */
export class Egg {
	radius: number;
	private readonly dots: (readonly [number, number])[] = [];
	private rings: number[] = [];
	private readonly ringCount: number;
	private readonly hatchAt: number;
	private state: "incubating" | "hatching" = "incubating";
	private hatchStart = 0;

	constructor(
		readonly id: string,
		readonly position: Vec2,
		bornAt: number,
		rng: Rng,
		private readonly config: EggConfig
	) {
		this.radius = rng.range(config.initialRadiusMin, config.initialRadiusMax);
		this.hatchAt =
			bornAt + config.hatchTimeMin + rng.float() * config.hatchTimeSpread;

		// Irregular egg outline: 6–9 random angles on the unit circle, sorted.
		const dotCount = Math.ceil(rng.range(6, 9));
		const angles: number[] = [0];
		for (let i = 0; i < dotCount; i++) {
			angles.push(rng.float() * Math.PI * 2);
		}
		angles.sort((a, b) => a - b);
		for (const a of angles) {
			this.dots.push([Math.sin(a), Math.cos(a)]);
		}
		this.ringCount = Math.ceil(rng.range(5, 8));
		this.computeRings(bornAt);
	}

	private computeRings(time: number): void {
		const next: number[] = [];
		for (let i = 0; i < this.ringCount; i++) {
			// Original phase step 300ms per ring.
			next.push(1 - Math.sin((time - (this.ringCount - i) * 0.3) / 0.3) * 0.9);
		}
		this.rings = next;
	}

	update(time: number, dt: number): EggUpdateResult {
		this.computeRings(time);
		const growth =
			this.state === "hatching"
				? this.config.burstGrowthPerSecond
				: this.config.growthPerSecond;
		this.radius *= Math.pow(growth, dt);

		if (this.state === "incubating" && time >= this.hatchAt) {
			this.state = "hatching";
			this.hatchStart = time;
		} else if (
			this.state === "hatching" &&
			time - this.hatchStart > this.config.hatchBurstDuration
		) {
			return "hatch";
		}
		return "none";
	}

	snapshot(): EggSnapshot {
		return {
			kind: "egg",
			id: this.id,
			x: this.position.x,
			y: this.position.y,
			radius: this.radius,
			dots: this.dots,
			rings: this.rings,
		};
	}
}
