import { Vec2 } from "../core/Vec2";
import type {
	CircleObstacle,
	ObstacleFilter,
	Threat,
} from "../contracts/collision";
import type { PhysicsConfig, SpineParams } from "../contracts/config";
import type { SpineSegment } from "../contracts/simulation";

/**
 * Uniform spatial hash over circle obstacles. Entity counts are small, but
 * the grid keeps per-segment contact queries O(neighbors) instead of O(all),
 * which matters once worms grow long and numerous.
 */
export class ObstacleGrid {
	private readonly cells = new Map<string, CircleObstacle[]>();
	private maxRadius = 0;

	constructor(
		obstacles: readonly CircleObstacle[],
		private readonly cellSize: number
	) {
		for (const obstacle of obstacles) {
			this.maxRadius = Math.max(this.maxRadius, obstacle.radius);
			const key = this.keyOf(obstacle.center.x, obstacle.center.y);
			const bucket = this.cells.get(key);
			if (bucket === undefined) this.cells.set(key, [obstacle]);
			else bucket.push(obstacle);
		}
	}

	private keyOf(x: number, y: number): string {
		const cx = Math.floor(x / this.cellSize);
		const cy = Math.floor(y / this.cellSize);
		return `${String(cx)}:${String(cy)}`;
	}

	/** Every obstacle that could touch a circle of `radius` at `center`. */
	query(center: Vec2, radius: number): CircleObstacle[] {
		const reach = radius + this.maxRadius;
		const minX = Math.floor((center.x - reach) / this.cellSize);
		const maxX = Math.floor((center.x + reach) / this.cellSize);
		const minY = Math.floor((center.y - reach) / this.cellSize);
		const maxY = Math.floor((center.y + reach) / this.cellSize);

		const found: CircleObstacle[] = [];
		for (let cx = minX; cx <= maxX; cx++) {
			for (let cy = minY; cy <= maxY; cy++) {
				const bucket = this.cells.get(`${String(cx)}:${String(cy)}`);
				if (bucket !== undefined) found.push(...bucket);
			}
		}
		return found;
	}
}

/**
 * Push a body circle out of everything it overlaps and must not touch.
 * Position-based correction: each iteration moves the circle a `stiffness`
 * fraction of the deepest penetrations, so stacked constraints (wedged
 * between two bodies) settle over a few passes instead of jittering.
 */
export function resolveContacts(
	center: Vec2,
	radius: number,
	grid: ObstacleGrid,
	accept: ObstacleFilter,
	physics: PhysicsConfig
): Vec2 {
	let position = center;
	for (let iter = 0; iter < physics.iterations; iter++) {
		let correction = Vec2.zero;
		let contacts = 0;
		let deepest = 0;
		let deepestNormal = Vec2.zero;

		for (const obstacle of grid.query(position, radius)) {
			if (!accept(obstacle)) continue;
			const minDistance = radius + obstacle.radius + physics.separationSlack;
			const offset = position.sub(obstacle.center);
			const distance = offset.length();
			if (distance >= minDistance) continue;

			// Degenerate case: exactly concentric — push along a stable axis
			// derived from the obstacle so the result stays deterministic.
			const normal =
				distance > 1e-6
					? offset.scale(1 / distance)
					: Vec2.fromAngle(obstacle.center.x + obstacle.center.y);
			const depth = minDistance - distance;
			correction = correction.add(normal.scale(depth));
			if (depth > deepest) {
				deepest = depth;
				deepestNormal = normal;
			}
			contacts++;
		}

		if (contacts === 0) break;

		let step = correction.scale(1 / contacts);
		// Sandwiched between opposing bodies the corrections cancel and the
		// circle would stay jammed forever. Slide out sideways instead.
		if (step.length() < deepest * 1e-3) {
			step = deepestNormal.perp().scale(deepest);
		}
		step = step.scale(physics.stiffness);
		const magnitude = step.length();
		if (magnitude > physics.maxCorrection) {
			step = step.scale(physics.maxCorrection / magnitude);
		}
		position = position.add(step);
	}
	return position;
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
	accept?: ObstacleFilter
): Threat | null {
	let nearest: Threat | null = null;
	for (const obstacle of obstacles) {
		if (accept?.(obstacle) === false) continue;

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
	return segments.map((seg, segmentIndex) => ({
		center: seg.position,
		radius: seg.halfWidth,
		kind: "worm" as const,
		ownerId,
		segmentIndex,
	}));
}

/**
 * True when two circles of the same spine are so close along the body that
 * they overlap by construction — those pairs must never generate contacts.
 */
export function isStructuralNeighbor(
	segmentIndex: number,
	other: CircleObstacle,
	radius: number,
	spine: SpineParams,
	physics: PhysicsConfig
): boolean {
	const gap = Math.abs((other.segmentIndex ?? 0) - segmentIndex);
	const unavoidable = (radius + other.radius) / spine.spacing;
	return gap <= Math.max(physics.selfContactExclusion, unavoidable);
}
