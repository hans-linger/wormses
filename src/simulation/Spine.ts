import { Vec2 } from "../core/Vec2";
import { angleDelta, normalizeAngle } from "../core/angles";

export interface SpineParams {
	/** Rest distance between consecutive segments. */
	readonly spacing: number;
	/** Allowed relative stretch/squash of a link: [1−b, 1+b]·spacing. */
	readonly bendTolerance: number;
	/**
	 * Self-intersection guard: minimum turning radius is
	 * halfWidth · widthRadiusFactor, so fat bodies must curve wider.
	 */
	readonly widthRadiusFactor: number;
	/** Absolute per-joint bend cap in radians, even for zero-width spines. */
	readonly maxBendCap: number;
}

export interface SpineSegment {
	position: Vec2;
	/** Forward direction of this segment (toward the head). */
	heading: number;
	/** Current half-width at this segment, set from the harmonics each tick. */
	halfWidth: number;
}

/**
 * Follow-the-leader segment chain (port of `_old/.../wormLine.js` kinematics)
 * with a width-derived bend clamp: the angle between consecutive links is
 * limited to spacing / (halfWidth · widthRadiusFactor), which keeps the local
 * curvature radius at least one body-radius and prevents the body from
 * overlapping itself in tight turns.
 */
export class Spine {
	readonly segments: SpineSegment[] = [];
	private readonly params: SpineParams;

	constructor(
		head: Vec2,
		heading: number,
		segmentCount: number,
		params: SpineParams
	) {
		this.params = params;
		const backward = Vec2.fromAngle(heading + Math.PI);
		for (let i = 0; i < segmentCount; i++) {
			this.segments.push({
				position: head.add(backward.scale(i * params.spacing)),
				heading,
				halfWidth: 0,
			});
		}
	}

	get head(): SpineSegment {
		const head = this.segments[0];
		if (head === undefined) throw new Error("Spine has no segments");
		return head;
	}

	setHead(position: Vec2, heading: number): void {
		this.head.position = position;
		this.head.heading = normalizeAngle(heading);
	}

	/** Max bend angle allowed at segment i, derived from local width. */
	private maxBendAt(i: number): number {
		const seg = this.segments[i];
		const halfWidth = seg === undefined ? 0 : seg.halfWidth;
		const minRadius = halfWidth * this.params.widthRadiusFactor;
		if (minRadius <= 0) return this.params.maxBendCap;
		return Math.min(this.params.maxBendCap, this.params.spacing / minRadius);
	}

	/** Pull every segment after its predecessor, clamping stretch and bend. */
	follow(): void {
		const { spacing, bendTolerance } = this.params;
		const minDist = spacing * (1 - bendTolerance);
		const maxDist = spacing * (1 + bendTolerance);

		// Reference direction of the previous link; for the first link it is
		// the head's backward direction.
		let prevLinkAngle = normalizeAngle(this.head.heading + Math.PI);

		for (let i = 1; i < this.segments.length; i++) {
			const seg = this.segments[i];
			const prev = this.segments[i - 1];
			if (seg === undefined || prev === undefined) continue;

			const offset = seg.position.sub(prev.position);
			let dist = offset.length();
			let linkAngle = dist === 0 ? prevLinkAngle : offset.angle();

			// Distance clamp (original wormLine.js behavior): clamp into the
			// tolerance band, then relax halfway back toward rest spacing.
			dist = Math.min(maxDist, Math.max(minDist, dist));
			dist -= 0.5 * Math.abs(dist - spacing);
			dist = Math.max(dist, minDist);

			// Bend clamp: link may deviate from the previous link's direction
			// by at most maxBendAt(i).
			const maxBend = this.maxBendAt(i);
			const bend = angleDelta(prevLinkAngle, linkAngle);
			if (Math.abs(bend) > maxBend) {
				linkAngle = normalizeAngle(prevLinkAngle + Math.sign(bend) * maxBend);
			}

			seg.position = prev.position.add(Vec2.fromAngle(linkAngle, dist));
			seg.heading = normalizeAngle(linkAngle + Math.PI);
			prevLinkAngle = linkAngle;
		}
	}

	/** Append segments at the tail, continuing the last link's direction. */
	grow(count: number): void {
		for (let k = 0; k < count; k++) {
			const tail = this.segments[this.segments.length - 1];
			if (tail === undefined) return;
			const backward = Vec2.fromAngle(tail.heading + Math.PI);
			this.segments.push({
				position: tail.position.add(backward.scale(this.params.spacing)),
				heading: tail.heading,
				halfWidth: tail.halfWidth,
			});
		}
	}

	/** Drop segments from the tail (shrinking). */
	shrink(count: number): void {
		const keep = Math.max(1, this.segments.length - count);
		this.segments.length = keep;
	}
}
