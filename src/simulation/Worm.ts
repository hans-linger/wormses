import type { Rng } from "../core/Rng";
import { Vec2 } from "../core/Vec2";
import { turnToward } from "../core/angles";
import {
	findNearestThreat,
	type CircleObstacle,
	type Threat,
} from "./collision";
import type { FoodKind } from "./Food";
import {
	classicHarmonics,
	widthAt,
	type Harmonic,
	type HarmonicContext,
} from "./harmonics";
import { Spine } from "./Spine";
import { combineSeekAvoid, maxTurnRate } from "./steering";
import type { WormSnapshot } from "./snapshots";
import type { WormConfig } from "./WorldConfig";

/** Minimal view of a food item the worm can target. */
export interface FoodTarget {
	readonly id: string;
	readonly position: Vec2;
	/** Base radius of the item — eating succeeds anywhere at its edge. */
	readonly radius: number;
}

/** Everything a worm may observe during one tick — provided by the World. */
export interface WormContext {
	readonly time: number;
	readonly dt: number;
	readonly rng: Rng;
	readonly worldWidth: number;
	readonly worldHeight: number;
	readonly edgeMargin: number;
	readonly food: readonly FoodTarget[];
	readonly obstacles: readonly CircleObstacle[];
}

/** Side effects a worm requests; the World applies them. */
export type WormIntent =
	| { readonly type: "eat"; readonly foodId: string }
	| { readonly type: "expired" };

export type WormState = "alive" | "dying";

export class Worm {
	state: WormState = "alive";
	readonly spine: Spine;
	readonly colorSeed: number;
	readonly strokeWidth: number;
	baseWidth: number;
	maxSpeed: number;

	private heading: number;
	private speed = 0;
	private targetLength: number;
	private readonly maxLength: number;
	private targetFoodId: string | null = null;
	private dyingStart = 0;
	private dyingSpeed = 0;
	private opacity = 1;
	private readonly harmonics: readonly Harmonic[];

	// Intellect: progress memory, per-food frustration, avoidance commitment.
	private bestTargetDist = Infinity;
	private lastProgressAt = 0;
	private readonly foodBlacklist = new Map<string, number>();
	private avoidSideMemory: { ownerId: string; side: 1 | -1 } | null = null;

	constructor(
		readonly id: string,
		position: Vec2,
		heading: number,
		rng: Rng,
		private readonly config: WormConfig,
		harmonics: readonly Harmonic[] = classicHarmonics
	) {
		const length = Math.round(
			rng.range(config.initialLengthMin, config.initialLengthMax)
		);
		this.spine = new Spine(position, heading, length, config.spine);
		this.heading = heading;
		this.baseWidth = rng.range(config.baseWidthMin, config.baseWidthMax);
		this.maxSpeed = config.maxSpeed;
		this.maxLength = config.maxLengthBase * (1 + rng.float() * config.maxLengthSpread);
		this.colorSeed = rng.float();
		this.strokeWidth = 1 + rng.float() * 2;
		this.targetLength = length;
		this.harmonics = harmonics;
	}

	get headPosition(): Vec2 {
		return this.spine.head.position;
	}

	/** Current food target id, null while wandering. Exposed for debug/tests. */
	get targetId(): string | null {
		return this.targetFoodId;
	}

	/** Applied by the World when this worm's eat intent succeeds. */
	applyFood(kind: FoodKind, value: number): void {
		switch (kind) {
			case "length":
				this.targetLength += value * this.config.growthLengthPerValue;
				break;
			case "width":
				this.baseWidth += value * this.config.growthWidthPerValue;
				break;
			case "power":
				this.maxSpeed += value * this.config.growthSpeedPerValue;
				break;
		}
	}

	update(ctx: WormContext): WormIntent | null {
		if (this.state === "dying") {
			return this.updateDying(ctx);
		}

		const target = this.acquireTarget(ctx);
		const head = this.headPosition;

		let seekPoint: Vec2;
		if (target === null) {
			// No (reachable) food: wander toward the world center.
			seekPoint = new Vec2(ctx.worldWidth / 2, ctx.worldHeight / 2);
		} else {
			seekPoint = target.position;
			const dist = head.distanceTo(seekPoint);
			// Eating succeeds anywhere at the item's edge, so the final
			// approach never needs surgical precision.
			if (dist < Math.max(this.config.eatRadius, target.radius)) {
				this.targetFoodId = null;
				this.bestTargetDist = Infinity;
				return { type: "eat", foodId: target.id };
			}
			this.trackProgress(target, dist, ctx.time);
		}

		this.advance(ctx, seekPoint, target !== null);

		if (this.targetLength > this.maxLength) {
			this.state = "dying";
			this.dyingStart = ctx.time;
			this.dyingSpeed = this.speed;
		}
		return null;
	}

	private updateDying(ctx: WormContext): WormIntent | null {
		const elapsed = ctx.time - this.dyingStart;
		if (elapsed > this.config.dyingDuration) {
			return { type: "expired" };
		}
		const fade = 1 - elapsed / this.config.dyingDuration;
		this.opacity = Math.max(0, fade);
		this.speed = this.dyingSpeed * fade;
		const step = Vec2.fromAngle(this.heading, this.speed * ctx.dt);
		this.spine.setHead(
			this.clampToWorld(this.headPosition.add(step), ctx),
			this.heading
		);
		this.updateSpine(ctx.time);
		return null;
	}

	/** The head may never leave the world — dying or not. */
	private clampToWorld(position: Vec2, ctx: WormContext): Vec2 {
		return new Vec2(
			Math.min(ctx.worldWidth - 2, Math.max(2, position.x)),
			Math.min(ctx.worldHeight - 2, Math.max(2, position.y))
		);
	}

	/**
	 * Frustration memory: abandon a target we are not getting closer to
	 * (orbiting around an obstacle, blocked path, ...) and blacklist it for
	 * a while so another target — or a wander phase — takes over.
	 */
	private trackProgress(target: FoodTarget, dist: number, time: number): void {
		if (dist < this.bestTargetDist - this.config.minProgress) {
			this.bestTargetDist = dist;
			this.lastProgressAt = time;
			return;
		}
		if (time - this.lastProgressAt > this.config.stuckTimeout) {
			this.foodBlacklist.set(target.id, time + this.config.retargetCooldown);
			this.targetFoodId = null;
			this.bestTargetDist = Infinity;
		}
	}

	private acquireTarget(ctx: WormContext): FoodTarget | null {
		for (const [id, expiry] of this.foodBlacklist) {
			if (expiry <= ctx.time) this.foodBlacklist.delete(id);
		}
		if (this.targetFoodId !== null) {
			const existing = ctx.food.find((f) => f.id === this.targetFoodId);
			if (existing !== undefined) return existing;
		}
		const candidates = ctx.food.filter((f) => !this.foodBlacklist.has(f.id));
		if (candidates.length === 0) {
			this.targetFoodId = null;
			return null;
		}
		const picked = ctx.rng.pick(candidates);
		this.targetFoodId = picked.id;
		this.bestTargetDist = Infinity;
		this.lastProgressAt = ctx.time;
		return picked;
	}

	private advance(ctx: WormContext, seekPoint: Vec2, hasTarget: boolean): void {
		const cfg = this.config;
		const head = this.headPosition;
		const dist = head.distanceTo(seekPoint);

		// Peristaltic speed: distance-proportional, surged by (1 + sin).
		let speed =
			Math.min(this.maxSpeed, dist * cfg.speedGainPerDistance) *
			(1 + Math.sin(ctx.time * cfg.surgeFrequency));

		// Edge slowdown, floored so a worm at the wall can always crawl back
		// (the original's fade-to-zero could freeze a worm forever).
		const m = ctx.edgeMargin;
		const edgeFactor = (proximity: number): number =>
			Math.max(0.1, 0.5 * (proximity / m));
		if (head.x < m) speed *= edgeFactor(head.x);
		if (head.y < m) speed *= edgeFactor(head.y);
		if (head.x > ctx.worldWidth - m) speed *= edgeFactor(ctx.worldWidth - head.x);
		if (head.y > ctx.worldHeight - m)
			speed *= edgeFactor(ctx.worldHeight - head.y);

		// Careful approach (the original computed this but never applied it).
		if (dist < cfg.approachSlowRadius) speed *= cfg.approachSlowFactor;
		this.speed = speed;

		// Steering: seek the target, pushed off course by the nearest threat.
		const headHalfWidth = this.spine.head.halfWidth;
		let threat = this.findThreat(ctx, headHalfWidth);

		// Goal awareness: an obstacle farther away than the target itself is
		// irrelevant — we will have eaten before reaching it.
		if (threat !== null && hasTarget && threat.distance > dist) {
			threat = null;
		}

		// Commitment: keep passing a given obstacle on the same side instead
		// of dithering left/right on successive frames.
		let avoidStrength = cfg.avoidStrength;
		if (threat === null) {
			this.avoidSideMemory = null;
		} else {
			const ownerId = threat.obstacle.ownerId;
			if (this.avoidSideMemory?.ownerId === ownerId) {
				threat = { ...threat, side: this.avoidSideMemory.side };
			} else {
				this.avoidSideMemory = { ownerId, side: threat.side };
			}
			// The worm's own body is a soft constraint, not a wall.
			if (ownerId === this.id) avoidStrength *= cfg.ownBodyAvoidFactor;
		}

		const seekHeading = seekPoint.sub(head).angle();
		const desired = combineSeekAvoid(
			seekHeading,
			threat,
			cfg.avoidLookAhead,
			avoidStrength
		);

		// Width-limited turning: radius never below one body radius.
		const turnCap =
			maxTurnRate(
				this.speed,
				headHalfWidth * cfg.spine.widthRadiusFactor,
				cfg.turnRateCap
			) * ctx.dt;
		this.heading = turnToward(this.heading, desired, turnCap);

		if (dist > 1) {
			const step = Vec2.fromAngle(this.heading, this.speed * ctx.dt);
			this.spine.setHead(this.clampToWorld(head.add(step), ctx), this.heading);
		}

		// Grow toward the fractional target length.
		const want = Math.floor(this.targetLength);
		if (want > this.spine.segments.length) {
			this.spine.grow(want - this.spine.segments.length);
		}

		this.opacity = 0.8 + Math.abs(Math.sin(ctx.time / 0.3)) * 0.2;
		this.updateSpine(ctx.time);
	}

	private findThreat(
		ctx: WormContext,
		clearance: number
	): Threat | null {
		return findNearestThreat(
			this.headPosition,
			Vec2.fromAngle(this.heading),
			this.config.avoidLookAhead,
			clearance,
			ctx.obstacles,
			(o) =>
				o.ownerId === this.id &&
				(o.segmentIndex ?? 0) < this.config.selfAvoidHeadExclusion
		);
	}

	/** Evaluate the harmonics into per-segment half-widths, then follow. */
	private updateSpine(time: number): void {
		const segments = this.spine.segments;
		for (let i = 0; i < segments.length; i++) {
			const seg = segments[i];
			if (seg === undefined) continue;
			const context: HarmonicContext = {
				i,
				length: segments.length,
				baseWidth: this.baseWidth,
				velocity: this.speed,
				time,
			};
			seg.halfWidth = widthAt(this.harmonics, context);
		}
		this.spine.follow();
	}

	snapshot(): WormSnapshot {
		return {
			kind: "worm",
			id: this.id,
			segments: this.spine.segments.map((s) => ({
				x: s.position.x,
				y: s.position.y,
				heading: s.heading,
				halfWidth: s.halfWidth,
			})),
			colorSeed: this.colorSeed,
			strokeWidth: this.strokeWidth,
			opacity: this.opacity,
			dying: this.state === "dying",
			length: this.spine.segments.length,
			baseWidth: this.baseWidth,
			maxSpeed: this.maxSpeed,
			targetId: this.targetFoodId,
		};
	}
}
