const TWO_PI = Math.PI * 2;

/** Wrap an angle into (-PI, PI]. */
export function normalizeAngle(angle: number): number {
	let a = angle % TWO_PI;
	if (a <= -Math.PI) a += TWO_PI;
	else if (a > Math.PI) a -= TWO_PI;
	return a;
}

/** Signed shortest rotation taking heading `from` onto heading `to`. */
export function angleDelta(from: number, to: number): number {
	return normalizeAngle(to - from);
}

/**
 * Rotate `current` toward `target` by at most `maxDelta` radians, always
 * taking the short way around the circle (handles the ±PI seam).
 */
export function turnToward(
	current: number,
	target: number,
	maxDelta: number
): number {
	const delta = angleDelta(current, target);
	if (Math.abs(delta) <= maxDelta) return normalizeAngle(target);
	return normalizeAngle(current + Math.sign(delta) * maxDelta);
}
