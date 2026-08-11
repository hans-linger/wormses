import { Rng } from "../core/Rng";
import { assertNever } from "../core/guards";
import type { FoodKind } from "../simulation/Food";

/**
 * Derive a worm's color from its colorSeed — a port of the original
 * generateWormColor: three channels in [30, 250] (muted pastels on black).
 */
export function wormColor(colorSeed: number): string {
	const rng = new Rng(Math.floor(colorSeed * 0xffffffff));
	const channel = (): string =>
		Math.floor(30 + 220 * rng.float())
			.toString(16)
			.padStart(2, "0");
	return `#${channel()}${channel()}${channel()}`;
}

/** Original food type colors: length=green, width=blue, power=red. */
export function foodColor(kind: FoodKind): string {
	switch (kind) {
		case "length":
			return "#00ff00";
		case "width":
			return "#0000ff";
		case "power":
			return "#ff0000";
		default:
			return assertNever(kind);
	}
}
