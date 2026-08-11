import type { Vec2 } from "../core/Vec2";

/** What kind of body a circle belongs to — drives collision filtering. */
export type ObstacleKind = "worm" | "egg" | "food";

/**
 * Everything collidable reduces to circles: eggs and food directly, worm
 * bodies as capsule chains (one circle per spine segment).
 */
export interface CircleObstacle {
	readonly center: Vec2;
	readonly radius: number;
	readonly kind: ObstacleKind;
	/** Entity id owning this circle, for self-exclusion. */
	readonly ownerId: string;
	/**
	 * For capsule-chain obstacles: index of the segment along the owner's
	 * spine. Lets a body skip contacts with its own immediate neighbors.
	 */
	readonly segmentIndex?: number;
}

/** Result of a forward feeler query — the nearest thing in the way. */
export interface Threat {
	readonly obstacle: CircleObstacle;
	/** Forward distance from the origin to the obstacle center's projection. */
	readonly distance: number;
	/** Which side of the heading the obstacle center lies on: +1 left, -1 right. */
	readonly side: 1 | -1;
	/** How deep the feeler corridor penetrates the inflated circle. */
	readonly overlap: number;
}

/** Filter deciding whether an obstacle is relevant to a given query. */
export type ObstacleFilter = (obstacle: CircleObstacle) => boolean;

/**
 * Resolves a body circle against the world: returns the position the circle
 * should be moved to so it no longer overlaps anything it must not touch.
 */
export type ContactResolver = (
	center: Vec2,
	radius: number,
	accept: ObstacleFilter
) => Vec2;
