import type { Rng } from "../core/Rng";
import type { Vec2 } from "../core/Vec2";
import type { CircleObstacle, ContactResolver } from "./collision";
import type { PhysicsConfig } from "./config";

/** One link of a worm's spine. */
export interface SpineSegment {
	position: Vec2;
	/** Forward direction of this segment (toward the head). */
	heading: number;
	/** Current half-width at this segment, set from the harmonics each tick. */
	halfWidth: number;
}

/** What a food item grows when eaten. */
export type FoodKind = "length" | "width" | "power";

/** Minimal view of a food item a worm can target. */
export interface FoodTarget {
	readonly id: string;
	readonly position: Vec2;
	/** Base radius of the item — eating succeeds anywhere at its edge. */
	readonly radius: number;
}

/** Everything a worm may observe during one tick, provided by the World. */
export interface WormContext {
	readonly time: number;
	readonly dt: number;
	readonly rng: Rng;
	readonly worldWidth: number;
	readonly worldHeight: number;
	readonly edgeMargin: number;
	readonly food: readonly FoodTarget[];
	/** foodId -> id of the worm currently heading for it, this tick. */
	readonly claims: ReadonlyMap<string, string>;
	/** All collidable circles this tick, including the worm's own body. */
	readonly obstacles: readonly CircleObstacle[];
	/** Hard contact resolution against the same set. */
	readonly resolve: ContactResolver;
	readonly physics: PhysicsConfig;
}

/** Side effects a worm requests; the World applies them. */
export type WormIntent =
	| { readonly type: "eat"; readonly foodId: string }
	| { readonly type: "expired" };

export type WormState = "alive" | "dying";

export type EggUpdateResult = "none" | "hatch";
