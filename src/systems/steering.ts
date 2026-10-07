import { normalizeAngle } from "../core/angles";
import type { Vec2 } from "../core/Vec2";
import type { CircleObstacle, Threat } from "../contracts/collision";

/**
 * Width-limited turn rate (self-intersection guard at the steering level):
 * angular velocity is capped so the head's turning radius never drops below
 * `minRadius` (typically the worm's local body radius times a safety factor).
 */
export function maxTurnRate(
	speed: number,
	minRadius: number,
	cap: number
): number {
	if (minRadius <= 0) return cap;
	return Math.min(cap, speed / minRadius);
}

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

/**
 * Blend obstacle avoidance into a seek heading: the nearer the threat, the
 * harder the push away from its side. Returns the desired heading.
 */
export function combineSeekAvoid(
	seekHeading: number,
	threat: Threat | null,
	lookAhead: number,
	avoidStrength: number
): number {
	if (threat === null) return seekHeading;
	const urgency = clamp01(1 - threat.distance / lookAhead);
	const push = -threat.side * avoidStrength * urgency;
	return normalizeAngle(seekHeading + push);
}

/**
 * Personal space. The forward feeler only sees what is directly ahead, so
 * worms foraging the same patch would slide along each other for seconds at
 * a time. This adds a gentle push away from nearby foreign bodies in any
 * direction, proportional to how close and how abreast they are — the
 * difference between a crowd and a shoal.
 */
export function separationOffset(
	position: Vec2,
	heading: number,
	neighbors: readonly CircleObstacle[],
	ownRadius: number,
	range: number,
	strength: number
): number {
	let pushX = 0;
	let pushY = 0;
	for (const neighbor of neighbors) {
		const away = position.sub(neighbor.center);
		const gap = away.length() - neighbor.radius - ownRadius;
		if (gap >= range) continue;
		// Weight rises as the gap closes; overlapping neighbors weigh most.
		const weight = clamp01(1 - gap / range);
		const dir = away.normalize();
		pushX += dir.x * weight;
		pushY += dir.y * weight;
	}
	if (pushX === 0 && pushY === 0) return 0;

	const desired = Math.atan2(pushY, pushX);
	const magnitude = Math.min(1, Math.hypot(pushX, pushY));
	// Only the component across our heading matters; braking is the speed
	// controller's job, not the steering's.
	return normalizeAngle(desired - heading) >= 0
		? strength * magnitude
		: -strength * magnitude;
}
