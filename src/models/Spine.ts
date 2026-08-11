import { Vec2 } from "../core/Vec2";
import { angleDelta, normalizeAngle } from "../core/angles";
import type { SpineParams } from "../contracts/config";
import type { SpineSegment } from "../contracts/simulation";

/** Pushes a body circle out of whatever it must not overlap. */
export type SegmentResolver = (
	position: Vec2,
	radius: number,
	segmentIndex: number
) => Vec2;

/**
 * Follow-the-leader segment chain (port of `_old/.../wormLine.js` kinematics)
 * with two additions:
 *
 * - a width-derived bend clamp — the angle between consecutive links is
 *   limited to spacing / (halfWidth · widthRadiusFactor), keeping the local
 *   curvature radius at least one body radius so the body cannot fold onto
 *   itself in tight turns;
 * - optional contact resolution — collisions bend the link direction, never
 *   its length, so the chain stays coherent while flowing around obstacles.
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
	follow(resolve?: SegmentResolver): void {
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

			const maxBend = this.maxBendAt(i);

			// Contact resolution. The pushed-out position is kept verbatim
			// whenever it already satisfies the link constraints — forcing
			// every segment back onto an exact distance would discard the
			// separation and let bodies sit inside each other. Only when the
			// push violates a constraint is it projected back onto it.
			if (resolve !== undefined) {
				const candidate = prev.position.add(Vec2.fromAngle(linkAngle, dist));
				const pushed = resolve(candidate, seg.halfWidth, i);
				if (pushed !== candidate) {
					const bent = pushed.sub(prev.position);
					const pushedDist = bent.length();
					const pushedAngle = pushedDist > 1e-6 ? bent.angle() : linkAngle;
					const withinBand = pushedDist >= minDist && pushedDist <= maxDist;
					const withinBend =
						Math.abs(angleDelta(prevLinkAngle, pushedAngle)) <= maxBend;
					if (withinBand && withinBend) {
						seg.position = pushed;
						seg.heading = normalizeAngle(pushedAngle + Math.PI);
						prevLinkAngle = pushedAngle;
						continue;
					}
					linkAngle = pushedAngle;
					dist = Math.min(maxDist, Math.max(minDist, pushedDist));
				}
			}

			// Bend clamp: link may deviate from the previous link's direction
			// by at most maxBendAt(i).
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
