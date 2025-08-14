export type RadiusKey = { h: number; r: number };

export function clamp01(x: number) {
	return Math.max(0, Math.min(1, x));
}
export function lerp(a: number, b: number, t: number) {
	return a + (b - a) * t;
}
export function cosineEase(t: number) {
	return (1 - Math.cos(Math.PI * clamp01(t))) * 0.5;
}
export function smoothstep(t: number) {
	t = clamp01(t);
	return t * t * (3 - 2 * t);
}

export type FdR = (r0: number, r1: number, t: number) => number;

export const fdR_linear: FdR = (r0, r1, t) => lerp(r0, r1, clamp01(t));
export const fdR_cosine: FdR = (r0, r1, t) => lerp(r0, r1, cosineEase(t));
export const fdR_smooth: FdR = (r0, r1, t) => lerp(r0, r1, smoothstep(t));

export function radiusFromKeys(keys: RadiusKey[], fdR: FdR, h: number) {
	if (keys.length === 0) return 0.5;
	if (h <= keys[0].h) return keys[0].r;
	if (h >= keys[keys.length - 1].h) return keys[keys.length - 1].r;

	for (let i = 0; i < keys.length - 1; i++) {
		const a = keys[i];
		const b = keys[i + 1];
		if (h >= a.h && h <= b.h) {
			const t = (h - a.h) / (b.h - a.h);
			return fdR(a.r, b.r, t);
		}
	}
	return keys[keys.length - 1].r;
}

export function pulseF(h: number, t: number) {
	const wave = 0.15 * Math.sin(8.0 * h - 2.0 * t);
	const breathe = 0.08 * Math.sin(0.7 * t);
	return 1.0 + wave + breathe;
}
