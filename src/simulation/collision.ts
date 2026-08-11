import type { Vec2 } from "../core/Vec2";
import type { SpineSegment } from "./Spine";

/** Everything avoidable reduces to circles: eggs directly, worm bodies as capsule chains. */
export interface CircleObstacle {
	readonly center: Vec2;
	readonly radius: number;
	/** Entity id owning this circle, for exclusion (e.g. a worm's own body). */
	readonly ownerId: string;
}

export interface Threat {
	readonly obstacle: CircleObstacle;
	/** Forward distance from the origin to the obstacle center's projection. */
	readonly distance: number;
	/** Which side of the heading the obstacle center lies on: +1 left, -1 right. */
	readonly side: 1 | -1;
	/** How deep the feeler corridor penetrates the inflated circle. */
	readonly overlap: number;
}

/**
 * Reynolds-style feeler query: looks ahead of `origin` along unit vector
 * `heading` for the nearest circle whose radius, inflated by `clearance`
 * (the seeker's own half-width), intersects the look-ahead corridor.
 * Returns null when the path is clear.
 */
export function findNearestThreat(
	origin: Vec2,
	heading: Vec2,
	lookAhead: number,
	clearance: number,
	obstacles: readonly CircleObstacle[],
	exclude?: (obstacle: CircleObstacle) => boolean
): Threat | null {
	let nearest: Threat | null = null;
	for (const obstacle of obstacles) {
		if (exclude?.(obstacle) === true) continue;

		const rel = obstacle.center.sub(origin);
		const forward = rel.dot(heading);
		if (forward < 0) continue;

		const inflated = obstacle.radius + clearance;
		if (forward > lookAhead + inflated) continue;

		const lateral = heading.cross(rel);
		const overlap = inflated - Math.abs(lateral);
		if (overlap <= 0) continue;

		if (nearest === null || forward < nearest.distance) {
			nearest = {
				obstacle,
				distance: forward,
				side: lateral >= 0 ? 1 : -1,
				overlap,
			};
		}
	}
	return nearest;
}

/** A worm body as an obstacle: one circle per segment, radius = half-width. */
export function spineObstacles(
	segments: readonly SpineSegment[],
	ownerId: string
): CircleObstacle[] {
	return segments.map((seg) => ({
		center: seg.position,
		radius: seg.halfWidth,
		ownerId,
	}));
}
