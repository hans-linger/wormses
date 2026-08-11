/**
 * 2D vector with immutable-style operations: every method returns a new Vec2.
 * Heading convention: angle 0 points along +x, PI/2 along +y (standard atan2).
 */
export class Vec2 {
	constructor(
		public readonly x: number,
		public readonly y: number
	) {}

	static readonly zero = new Vec2(0, 0);

	static fromAngle(angle: number, length = 1): Vec2 {
		return new Vec2(Math.cos(angle) * length, Math.sin(angle) * length);
	}

	add(v: Vec2): Vec2 {
		return new Vec2(this.x + v.x, this.y + v.y);
	}

	sub(v: Vec2): Vec2 {
		return new Vec2(this.x - v.x, this.y - v.y);
	}

	scale(s: number): Vec2 {
		return new Vec2(this.x * s, this.y * s);
	}

	length(): number {
		return Math.hypot(this.x, this.y);
	}

	lengthSq(): number {
		return this.x * this.x + this.y * this.y;
	}

	normalize(): Vec2 {
		const len = this.length();
		return len === 0 ? Vec2.zero : this.scale(1 / len);
	}

	distanceTo(v: Vec2): number {
		return Math.hypot(this.x - v.x, this.y - v.y);
	}

	dot(v: Vec2): number {
		return this.x * v.x + this.y * v.y;
	}

	/** z-component of the 3D cross product; sign tells which side v lies on. */
	cross(v: Vec2): number {
		return this.x * v.y - this.y * v.x;
	}

	/** Counter-clockwise perpendicular. */
	perp(): Vec2 {
		return new Vec2(-this.y, this.x);
	}

	angle(): number {
		return Math.atan2(this.y, this.x);
	}

	lerp(v: Vec2, t: number): Vec2 {
		return new Vec2(this.x + (v.x - this.x) * t, this.y + (v.y - this.y) * t);
	}
}
