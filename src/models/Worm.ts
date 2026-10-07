import type { Rng } from "../core/Rng";
import { Vec2 } from "../core/Vec2";
import { normalizeAngle, turnToward } from "../core/angles";
import type {
	CircleObstacle,
	ContactResolver,
	Threat,
} from "../contracts/collision";
import type { PhysicsConfig, WormConfig } from "../contracts/config";
import type { Harmonic, HarmonicContext } from "../contracts/harmonics";
import type {
	FoodKind,
	FoodTarget,
	WormContext,
	WormIntent,
	WormState,
} from "../contracts/simulation";
import type { WormSnapshot } from "../contracts/snapshots";
import { findNearestThreat, isStructuralNeighbor } from "../systems/collision";
import { classicHarmonics, widthAt } from "../systems/harmonics";
import {
	combineSeekAvoid,
	maxTurnRate,
	separationOffset,
} from "../systems/steering";
import { Spine } from "./Spine";

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
		this.maxLength =
			config.maxLengthBase * (1 + rng.float() * config.maxLengthSpread);
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
				this.baseWidth = Math.min(
					this.config.baseWidthCap,
					this.baseWidth + value * this.config.growthWidthPerValue
				);
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
			this.placeHead(ctx, this.headPosition.add(step)),
			this.heading
		);
		this.updateSpine(ctx);
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

	/**
	 * Foraging: worms eat locally. Picking uniformly from the whole world
	 * made every worm cross the map and pile up in one corner; instead a
	 * worm ranks food by distance, keeps the nearest few, and picks among
	 * those with a bias toward the closest — near-sighted but not robotic.
	 * Items another worm is already heading for are left alone, unless
	 * nothing else is on offer, so worms fan out across the field.
	 */
	private acquireTarget(ctx: WormContext): FoodTarget | null {
		for (const [id, expiry] of this.foodBlacklist) {
			if (expiry <= ctx.time) this.foodBlacklist.delete(id);
		}
		if (this.targetFoodId !== null) {
			const existing = ctx.food.find((f) => f.id === this.targetFoodId);
			if (existing !== undefined) return existing;
		}

		const open = ctx.food.filter((f) => !this.foodBlacklist.has(f.id));
		const claimedByOthers = (f: FoodTarget): boolean => {
			const owner = ctx.claims.get(f.id);
			return owner !== undefined && owner !== this.id;
		};
		const unclaimed = open.filter((f) => !claimedByOthers(f));
		// Falling back to contested food keeps a worm fed when the field is
		// fully spoken for, rather than starving it into a standoff.
		const candidates = unclaimed.length > 0 ? unclaimed : open;
		if (candidates.length === 0) {
			this.targetFoodId = null;
			return null;
		}

		const head = this.headPosition;
		const nearest = [...candidates]
			.sort((a, b) => head.distanceTo(a.position) - head.distanceTo(b.position))
			.slice(0, Math.max(1, this.config.foragingCandidates));
		const roll = Math.pow(ctx.rng.float(), this.config.foragingBias);
		const picked = nearest[Math.min(nearest.length - 1, Math.floor(roll * nearest.length))];
		if (picked === undefined) {
			this.targetFoodId = null;
			return null;
		}

		this.targetFoodId = picked.id;
		this.bestTargetDist = Infinity;
		this.lastProgressAt = ctx.time;
		return picked;
	}

	/**
	 * Contacts the head must resolve: every foreign body, plus its own spine
	 * beyond the structurally-overlapping neighborhood. The food it is
	 * currently eating is exempt — otherwise it would bounce off its meal.
	 */
	private placeHead(ctx: WormContext, position: Vec2): Vec2 {
		const radius = this.spine.head.halfWidth;
		const resolved = ctx.resolve(this.clampToWorld(position, ctx), radius, (o) =>
			this.acceptContact(o, 0, radius, true, ctx)
		);
		// Walls win over contacts: a body may end up touching another rather
		// than being pushed out of the world.
		return this.clampToWorld(resolved, ctx);
	}

	private acceptContact(
		obstacle: CircleObstacle,
		segmentIndex: number,
		radius: number,
		isHead: boolean,
		ctx: WormContext
	): boolean {
		if (obstacle.ownerId === this.id) {
			return !isStructuralNeighbor(
				segmentIndex,
				obstacle,
				radius,
				this.config.spine,
				ctx.physics
			);
		}
		if (isHead && obstacle.kind === "food") {
			return obstacle.ownerId !== this.targetFoodId;
		}
		return true;
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
		if (head.x > ctx.worldWidth - m)
			speed *= edgeFactor(ctx.worldWidth - head.x);
		if (head.y > ctx.worldHeight - m)
			speed *= edgeFactor(ctx.worldHeight - head.y);

		// Careful approach (the original computed this but never applied it).
		if (dist < cfg.approachSlowRadius) speed *= cfg.approachSlowFactor;
		this.speed = speed;

		// Steering: seek the target, pushed off course by the nearest threat.
		// Clearance is the *widest* part of the body, not the head — the body
		// follows wherever the head goes, so a gap the head fits through but
		// the belly does not is not a gap at all. The feeler reaches farther
		// the fatter and faster the worm is, since turning radius scales with
		// width and it must begin the turn before it is committed.
		const headHalfWidth = this.spine.head.halfWidth;
		const bodyRadius = this.bodyRadius();
		const lookAhead = Math.max(
			cfg.avoidLookAhead,
			bodyRadius * cfg.avoidRadiusFactor + this.speed * cfg.avoidReactionTime
		);
		let threat = this.findThreat(ctx, bodyRadius, lookAhead);

		// Goal awareness: scenery farther away than the target itself is
		// irrelevant, since we will have eaten before reaching it. Another
		// worm never is — food often sits just past someone's body, and
		// treating that body as ignorable drove worms straight through it.
		if (
			threat !== null &&
			hasTarget &&
			threat.distance > dist &&
			threat.obstacle.kind !== "worm"
		) {
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
		let desired = combineSeekAvoid(seekHeading, threat, lookAhead, avoidStrength);

		// Personal space: drift away from any foreign body crowding the head,
		// whether or not it is in the feeler's path.
		desired = normalizeAngle(
			desired +
				separationOffset(
					head,
					this.heading,
					ctx.obstacles.filter(
						(o) => o.kind === "worm" && o.ownerId !== this.id
					),
					headHalfWidth,
					cfg.separationRange,
					cfg.separationStrength
				)
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
			this.spine.setHead(this.placeHead(ctx, head.add(step)), this.heading);
		}

		// Grow toward the fractional target length.
		const want = Math.floor(this.targetLength);
		if (want > this.spine.segments.length) {
			this.spine.grow(want - this.spine.segments.length);
		}

		this.opacity = 0.8 + Math.abs(Math.sin(ctx.time / 0.3)) * 0.2;
		this.updateSpine(ctx);
	}

	/** Half-width of the thickest segment — the clearance the path must give. */
	private bodyRadius(): number {
		let max = 0;
		for (const seg of this.spine.segments) {
			max = Math.max(max, seg.halfWidth);
		}
		return max;
	}

	private findThreat(
		ctx: WormContext,
		clearance: number,
		lookAhead: number
	): Threat | null {
		return findNearestThreat(
			this.headPosition,
			Vec2.fromAngle(this.heading),
			lookAhead,
			clearance,
			ctx.obstacles,
			(o) => {
				if (o.ownerId === this.id) {
					return (o.segmentIndex ?? 0) >= this.config.selfAvoidHeadExclusion;
				}
				// Food is light scenery that gets shoved aside on contact, so
				// there is nothing to steer around — and steering around it in
				// a field this dense would leave a worm unable to reach any
				// meal at all. Only solid bodies deflect a worm.
				return o.kind !== "food";
			}
		);
	}

	/** Evaluate the harmonics into per-segment half-widths, then follow. */
	private updateSpine(ctx: WormContext): void {
		const segments = this.spine.segments;
		for (let i = 0; i < segments.length; i++) {
			const seg = segments[i];
			if (seg === undefined) continue;
			const context: HarmonicContext = {
				i,
				length: segments.length,
				baseWidth: this.baseWidth,
				velocity: this.speed,
				time: ctx.time,
			};
			seg.halfWidth = widthAt(this.harmonics, context);
		}
		this.spine.follow((position, radius, segmentIndex) =>
			ctx.resolve(position, radius, (o) =>
				this.acceptContact(o, segmentIndex, radius, false, ctx)
			)
		);
	}

	/**
	 * Post-update settle pass against *live* positions. The resolution during
	 * update() can only see start-of-tick geometry, so two worms moving
	 * toward each other would each resolve against stale data and still end
	 * up overlapping. Running the same constraint projection again — head
	 * separation, then a contact-aware follow — restores link lengths and
	 * bend limits while pushing bodies apart.
	 */
	settle(
		resolve: ContactResolver,
		physics: PhysicsConfig,
		bounds: { readonly width: number; readonly height: number }
	): void {
		const head = this.spine.head;
		const headRadius = head.halfWidth;
		const resolved = resolve(head.position, headRadius, (o) =>
			this.acceptSettle(o, 0, headRadius, physics)
		);
		this.spine.setHead(
			new Vec2(
				Math.min(bounds.width - 2, Math.max(2, resolved.x)),
				Math.min(bounds.height - 2, Math.max(2, resolved.y))
			),
			head.heading
		);
		this.spine.follow((position, radius, segmentIndex) =>
			resolve(position, radius, (o) =>
				this.acceptSettle(o, segmentIndex, radius, physics)
			)
		);
	}

	private acceptSettle(
		obstacle: CircleObstacle,
		segmentIndex: number,
		radius: number,
		physics: PhysicsConfig
	): boolean {
		if (obstacle.ownerId === this.id) {
			return !isStructuralNeighbor(
				segmentIndex,
				obstacle,
				radius,
				this.config.spine,
				physics
			);
		}
		if (segmentIndex === 0 && obstacle.kind === "food") {
			return obstacle.ownerId !== this.targetFoodId;
		}
		return true;
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
