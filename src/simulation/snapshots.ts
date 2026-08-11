import type { FoodKind } from "./Food";

/**
 * Read-only view of the world for renderers. This is the 2D/3D seam: a worm
 * is spine points + radius profile; a 2D renderer draws perpendicular
 * strokes, a 3D renderer can loft the same data into a tube.
 */
export interface WormSegmentSnapshot {
	readonly x: number;
	readonly y: number;
	/** Forward direction of the segment, radians. */
	readonly heading: number;
	readonly halfWidth: number;
}

export interface WormSnapshot {
	readonly kind: "worm";
	readonly id: string;
	readonly segments: readonly WormSegmentSnapshot[];
	/** Deterministic per-worm value in [0,1); renderers derive a color. */
	readonly colorSeed: number;
	readonly strokeWidth: number;
	readonly opacity: number;
	readonly dying: boolean;
	/** Debug/hover info. */
	readonly length: number;
	readonly baseWidth: number;
	readonly maxSpeed: number;
}

export interface EggSnapshot {
	readonly kind: "egg";
	readonly id: string;
	readonly x: number;
	readonly y: number;
	readonly radius: number;
	/** Unit-circle polygon vertices (sin, cos pairs) of the egg outline. */
	readonly dots: readonly (readonly [number, number])[];
	/** Relative radii of the concentric wobbly rings. */
	readonly rings: readonly number[];
}

export interface FoodSnapshot {
	readonly kind: "food";
	readonly id: string;
	readonly foodKind: FoodKind;
	readonly x: number;
	readonly y: number;
	readonly radius: number;
	readonly rings: readonly number[];
}

export type EntitySnapshot = WormSnapshot | EggSnapshot | FoodSnapshot;

export interface WorldSnapshot {
	readonly time: number;
	readonly width: number;
	readonly height: number;
	readonly worms: readonly WormSnapshot[];
	readonly eggs: readonly EggSnapshot[];
	readonly food: readonly FoodSnapshot[];
}
