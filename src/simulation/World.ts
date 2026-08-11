import { Rng } from "../core/Rng";
import { Vec2 } from "../core/Vec2";
import { spineObstacles, type CircleObstacle } from "./collision";
import { Egg } from "./Egg";
import { Food } from "./Food";
import type { WorldSnapshot } from "./snapshots";
import { Worm, type FoodTarget } from "./Worm";
import type { WorldConfig } from "./WorldConfig";

/**
 * The headless ecosystem: owns all entities, advances them with update(dt),
 * and applies the side effects they request (eating, dying, hatching).
 * No DOM, no canvas — renderers only ever see snapshot().
 */
export class World {
	time = 0;
	/** Lifetime counters, for the debug panel and behavior diagnostics. */
	readonly stats = { eaten: 0, hatched: 0, died: 0, abandoned: 0 };
	private readonly rng: Rng;
	private readonly worms = new Map<string, Worm>();
	private readonly eggs = new Map<string, Egg>();
	private readonly food = new Map<string, Food>();
	private nextId = 1;

	constructor(readonly config: WorldConfig) {
		this.rng = new Rng(config.seed);
		for (let i = 0; i < config.foodCount; i++) {
			this.spawnFood();
		}
		for (let i = 0; i < config.initialWorms; i++) {
			this.spawnWorm(this.randomInteriorPoint());
		}
		for (let i = 0; i < config.initialEggs; i++) {
			this.spawnEgg(this.randomInteriorPoint());
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

	spawnFood(position?: Vec2): Food {
		const item = new Food(
			this.newId("food"),
			position ?? this.randomInteriorPoint(),
			this.rng,
			this.config.food
		);
		this.food.set(item.id, item);
		return item;
	}

	/** All avoidable geometry this tick: worm bodies + eggs, as circles. */
	private collectObstacles(): CircleObstacle[] {
		const obstacles: CircleObstacle[] = [];
		for (const worm of this.worms.values()) {
			obstacles.push(...spineObstacles(worm.spine.segments, worm.id));
		}
		for (const egg of this.eggs.values()) {
			obstacles.push({
				center: egg.position,
				radius: egg.radius,
				ownerId: egg.id,
			});
		}
		return obstacles;
	}

	update(dt: number): void {
		this.time += dt;

		for (const item of this.food.values()) {
			item.update(this.time);
		}

		const obstacles = this.collectObstacles();
		const foodTargets: FoodTarget[] = [...this.food.values()].map((f) => ({
			id: f.id,
			position: f.position,
			radius: f.value,
		}));

		for (const worm of [...this.worms.values()]) {
			const intent = worm.update({
				time: this.time,
				dt,
				rng: this.rng,
				worldWidth: this.config.width,
				worldHeight: this.config.height,
				edgeMargin: this.config.edgeMargin,
				food: foodTargets,
				obstacles,
			});
			if (intent === null) continue;
			switch (intent.type) {
				case "eat": {
					const eaten = this.food.get(intent.foodId);
					if (eaten !== undefined) {
						worm.applyFood(eaten.kind, eaten.value);
						this.food.delete(eaten.id);
						this.spawnFood();
						this.stats.eaten++;
					}
					break;
				}
				case "expired": {
					this.worms.delete(worm.id);
					this.stats.died++;
					// Eggs always land in the interior, even if the worm died
					// pressed against a wall.
					const m = this.config.food.spawnMargin;
					this.spawnEgg(
						new Vec2(
							Math.min(this.config.width - m, Math.max(m, worm.headPosition.x)),
							Math.min(this.config.height - m, Math.max(m, worm.headPosition.y))
						)
					);
					break;
				}
			}
		}

		for (const egg of [...this.eggs.values()]) {
			if (egg.update(this.time, dt) === "hatch") {
				this.eggs.delete(egg.id);
				this.spawnWorm(egg.position);
				this.stats.hatched++;
			}
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
