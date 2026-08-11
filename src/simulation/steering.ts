import { normalizeAngle } from "../core/angles";
import type { Threat } from "./collision";

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
