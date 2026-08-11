import type { Rng } from "../core/Rng";
import type { Vec2 } from "../core/Vec2";
import type { FoodSnapshot } from "./snapshots";
import type { FoodConfig } from "./WorldConfig";

export type FoodKind = "length" | "width" | "power";

export const FOOD_KINDS: readonly FoodKind[] = ["length", "width", "power"];

/**
 * Food (né Meatball): a pulsing target worms seek and eat. The kind decides
 * what grows: body length, body width, or max speed. (The original's type
 * roll made the length kind unreachable — fixed here with a uniform pick.)
 */
export class Food {
	readonly kind: FoodKind;
	readonly value: number;
	radius: number;
	private rings: number[] = [];

	constructor(
		readonly id: string,
		readonly position: Vec2,
		rng: Rng,
		private readonly config: FoodConfig
	) {
		this.kind = rng.pick(FOOD_KINDS);
		this.value = rng.range(config.valueMin, config.valueMax);
		this.radius = this.value;
		this.update(0);
	}

	update(time: number): void {
		const { pulseFrequency, pulseAmplitude, ringCount } = this.config;
		this.radius =
			this.value * (1 + Math.sin(time * pulseFrequency) * pulseAmplitude);
		// Concentric rings breathing outward; original phase step was 2000ms.
		const next: number[] = [];
		for (let i = 0; i < ringCount; i++) {
			next.push(1 - Math.sin((time - (ringCount - i) * 2) / 2) * 0.9);
		}
		this.rings = next;
	}

	snapshot(): FoodSnapshot {
		return {
			kind: "food",
			id: this.id,
			foodKind: this.kind,
			x: this.position.x,
			y: this.position.y,
			radius: this.radius,
			rings: this.rings,
		};
	}
}
