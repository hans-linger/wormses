import { Rng } from "../core/Rng";
import { Vec2 } from "../core/Vec2";
import type { CircleObstacle } from "../contracts/collision";
import type { WorldConfig } from "../contracts/config";
import type { FoodTarget } from "../contracts/simulation";
import type { WorldSnapshot } from "../contracts/snapshots";
import {
	ObstacleGrid,
	resolveContacts,
	spineObstacles,
} from "../systems/collision";
import { Egg } from "./Egg";
import { Food } from "./Food";
import { Worm } from "./Worm";

/**
 * The headless ecosystem: owns all entities, advances them with update(dt),
 * and applies the side effects they request (eating, dying, hatching).
 * No DOM, no canvas — renderers only ever see snapshot().
 */
export class World {
	time = 0;
	/** Lifetime counters, for the debug panel and behavior diagnostics. */
	readonly stats = { eaten: 0, hatched: 0, died: 0 };

	private readonly rng: Rng;
	private readonly worms = new Map<string, Worm>();
	private readonly eggs = new Map<string, Egg>();
	private readonly food = new Map<string, Food>();
	private nextId = 1;

	constructor(readonly config: WorldConfig) {
		this.rng = new Rng(config.seed);
		this.topUpFood();
		for (let i = 0; i < config.initialWorms; i++) {
			this.spawnWorm(
				this.findFreePosition(config.worm.baseWidthCap) ??
					this.randomInteriorPoint()
			);
		}
		for (let i = 0; i < config.initialEggs; i++) {
			this.spawnEgg(
				this.findFreePosition(config.egg.initialRadiusMax) ??
					this.randomInteriorPoint()
			);
		}
	}

	get wormCount(): number {
		return this.worms.size;
	}

	get eggCount(): number {
		return this.eggs.size;
	}

	get foodCount(): number {
		return this.food.size;
	}

	private newId(prefix: string): string {
		return `${prefix}_${String(this.nextId++)}`;
	}

	private randomInteriorPoint(): Vec2 {
		const m = this.config.food.spawnMargin;
		return new Vec2(
			this.rng.range(m, this.config.width - m),
			this.rng.range(m, this.config.height - m)
		);
	}

	/** Keep a point inside the interior spawn band. */
	private clampToInterior(point: Vec2): Vec2 {
		const m = this.config.food.spawnMargin;
		return new Vec2(
			Math.min(this.config.width - m, Math.max(m, point.x)),
			Math.min(this.config.height - m, Math.max(m, point.y))
		);
	}

	/**
	 * Rejection-sample an interior point where a body of `radius` fits without
	 * touching anything. Returns null when the world is too crowded — nothing
	 * may ever materialize inside a worm, so the caller waits instead.
	 */
	private findFreePosition(radius: number): Vec2 | null {
		const obstacles = this.collectObstacles();
		for (let attempt = 0; attempt < this.config.spawnAttempts; attempt++) {
			const candidate = this.randomInteriorPoint();
			let clear = true;
			for (const obstacle of obstacles) {
				if (
					candidate.distanceTo(obstacle.center) <
					obstacle.radius + radius + this.config.physics.separationSlack
				) {
					clear = false;
					break;
				}
			}
			if (clear) return candidate;
		}
		return null;
	}

	/** Refill the larder, skipping ticks where there is genuinely no room. */
	private topUpFood(): void {
		while (this.food.size < this.config.foodCount) {
			const spot = this.findFreePosition(this.config.food.valueMax);
			if (spot === null) return;
			this.spawnFood(spot);
		}
	}

	spawnWorm(position: Vec2): Worm {
		const worm = new Worm(
			this.newId("worm"),
			position,
			this.rng.range(-Math.PI, Math.PI),
			this.rng,
			this.config.worm
		);
		this.worms.set(worm.id, worm);
		return worm;
	}

	spawnEgg(position: Vec2): Egg {
		const egg = new Egg(
			this.newId("egg"),
			position,
			this.time,
			this.rng,
			this.config.egg
		);
		this.eggs.set(egg.id, egg);
		return egg;
	}

	spawnFood(position: Vec2): Food {
		const item = new Food(
			this.newId("food"),
			position,
			this.rng,
			this.config.food
		);
		this.food.set(item.id, item);
		return item;
	}

	/** All collidable geometry this tick: worm bodies, eggs and food. */
	private collectObstacles(): CircleObstacle[] {
		const obstacles: CircleObstacle[] = [];
		for (const worm of this.worms.values()) {
			obstacles.push(...spineObstacles(worm.spine.segments, worm.id));
		}
		for (const egg of this.eggs.values()) {
			obstacles.push({
				center: egg.position,
				radius: egg.radius,
				kind: "egg",
				ownerId: egg.id,
			});
		}
		for (const item of this.food.values()) {
			obstacles.push({
				center: item.position,
				radius: item.radius,
				kind: "food",
				ownerId: item.id,
			});
		}
		return obstacles;
	}

	update(dt: number): void {
		this.time += dt;

		for (const item of this.food.values()) {
			item.update(this.time);
		}

		// One obstacle set and one grid per tick: every body resolves against
		// the same start-of-tick world, so the result is order-independent
		// enough to stay deterministic.
		const obstacles = this.collectObstacles();
		const grid = new ObstacleGrid(obstacles, this.config.physics.gridCellSize);
		const physics = this.config.physics;
		const foodTargets: FoodTarget[] = [...this.food.values()].map((f) => ({
			id: f.id,
			position: f.position,
			radius: f.value,
		}));

		// Who is already heading where, so worms spread across the field
		// instead of mobbing the same item.
		const claims = new Map<string, string>();
		for (const worm of this.worms.values()) {
			const targetId = worm.targetId;
			if (targetId !== null) claims.set(targetId, worm.id);
		}

		for (const worm of [...this.worms.values()]) {
			const intent = worm.update({
				time: this.time,
				dt,
				rng: this.rng,
				worldWidth: this.config.width,
				worldHeight: this.config.height,
				edgeMargin: this.config.edgeMargin,
				food: foodTargets,
				claims,
				obstacles,
				physics,
				resolve: (center, radius, accept) =>
					resolveContacts(center, radius, grid, accept, physics),
			});
			const claimed = worm.targetId;
			if (claimed !== null) claims.set(claimed, worm.id);
			if (intent === null) continue;
			switch (intent.type) {
				case "eat": {
					const eaten = this.food.get(intent.foodId);
					if (eaten !== undefined) {
						worm.applyFood(eaten.kind, eaten.value);
						this.food.delete(eaten.id);
						this.stats.eaten++;
					}
					break;
				}
				case "expired": {
					this.worms.delete(worm.id);
					this.stats.died++;
					// Eggs always land in the interior, even if the worm died
					// pressed against a wall.
					this.spawnEgg(this.clampToInterior(worm.headPosition));
					break;
				}
			}
		}

		this.separateBodies();
		this.displacePassiveBodies();
		this.topUpFood();

		for (const egg of [...this.eggs.values()]) {
			if (egg.update(this.time, dt) === "hatch") {
				this.eggs.delete(egg.id);
				this.spawnWorm(egg.position);
				this.stats.hatched++;
			}
		}
	}

	/**
	 * Global separation: alternate pushing bodies apart with restoring spine
	 * link lengths, the standard position-based-dynamics projection loop.
	 * Runs on live positions, so worms that moved toward each other during
	 * their own updates still end the tick apart. Corrections are halved
	 * because both sides of a worm-worm contact move.
	 */
	private separateBodies(): void {
		const physics = this.config.physics;
		// Both sides of a worm-worm contact move, so each takes half.
		const pass = { ...physics, stiffness: physics.stiffness * 0.5 };

		for (let iter = 0; iter < physics.iterations; iter++) {
			const grid = new ObstacleGrid(
				this.collectObstacles(),
				physics.gridCellSize
			);
			for (const worm of this.worms.values()) {
				worm.settle(
					(center, radius, accept) =>
						resolveContacts(center, radius, grid, accept, pass),
					physics,
					this.config
				);
			}
		}
	}

	/**
	 * Food and eggs are light scenery: a mature worm is wider than the gaps
	 * between them, so no amount of steering could keep a crowded world
	 * collision-free. Instead the passive bodies yield — they are pushed out
	 * of any worm that reaches them, which is both physically sensible and
	 * what keeps the field visually clean.
	 */
	private displacePassiveBodies(): void {
		const physics = this.config.physics;
		const wormCircles: CircleObstacle[] = [];
		for (const worm of this.worms.values()) {
			wormCircles.push(...spineObstacles(worm.spine.segments, worm.id));
		}
		if (wormCircles.length === 0) return;
		const grid = new ObstacleGrid(wormCircles, physics.gridCellSize);
		const acceptAll = (): boolean => true;
		const pass = { ...physics, iterations: physics.passiveIterations };

		// Who is currently chasing what: a worm must never shove its own meal
		// out of reach, or it would push the food ahead of itself forever.
		const claimedBy = new Map<string, string>();
		for (const worm of this.worms.values()) {
			if (worm.targetId !== null) claimedBy.set(worm.targetId, worm.id);
		}

		for (const item of this.food.values()) {
			const eater = claimedBy.get(item.id);
			item.position = this.clampToInterior(
				resolveContacts(
					item.position,
					item.radius,
					grid,
					eater === undefined
						? acceptAll
						: (o) =>
								o.ownerId !== eater ||
								(o.segmentIndex ?? 0) >= physics.eaterHeadExemption,
					pass
				)
			);
		}
		for (const egg of this.eggs.values()) {
			egg.position = this.clampToInterior(
				resolveContacts(egg.position, egg.radius, grid, acceptAll, pass)
			);
		}
	}

	snapshot(): WorldSnapshot {
		return {
			time: this.time,
			width: this.config.width,
			height: this.config.height,
			worms: [...this.worms.values()].map((w) => w.snapshot()),
			eggs: [...this.eggs.values()].map((e) => e.snapshot()),
			food: [...this.food.values()].map((f) => f.snapshot()),
		};
	}
}
