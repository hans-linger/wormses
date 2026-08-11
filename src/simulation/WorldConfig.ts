import type { SpineParams } from "./Spine";

/**
 * Every tunable constant of the simulation, in world units (px) and seconds.
 * Per-frame constants from the original 60fps code are converted to
 * per-second equivalents (×60), noted inline.
 */
export interface WormConfig {
	readonly spine: SpineParams;
	/** Starting segment count range. Original: 15 + rand·10. */
	readonly initialLengthMin: number;
	readonly initialLengthMax: number;
	/** Base body width range. Original: 4 + rand·5. */
	readonly baseWidthMin: number;
	readonly baseWidthMax: number;
	/** Max speed, px/s. Original: 2 px/frame. */
	readonly maxSpeed: number;
	/** Speed gained per px of target distance, 1/s. Original: 0.04/frame. */
	readonly speedGainPerDistance: number;
	/** Peristaltic surge: speed × (1 + sin(surgeFreq·t)). Original: t_ms/100. */
	readonly surgeFrequency: number;
	/** Absolute turn-rate cap, rad/s. Original: 4π/360 rad/frame. */
	readonly turnRateCap: number;
	/** Distance at which food is eaten. */
	readonly eatRadius: number;
	/** Distance at which approach slows (×0.4 intended in the original). */
	readonly approachSlowRadius: number;
	readonly approachSlowFactor: number;
	/** Segment-count death threshold: max = base·(1 + rand·spread). */
	readonly maxLengthBase: number;
	readonly maxLengthSpread: number;
	/** Seconds from length-death trigger to removal (fade + jitter). */
	readonly dyingDuration: number;
	/** Eating growth factors per food kind (per unit of food value). */
	readonly growthLengthPerValue: number;
	readonly growthWidthPerValue: number;
	/** px/s of max speed per unit of power-food value. Original: value/32 px/frame. */
	readonly growthSpeedPerValue: number;
	/** Obstacle avoidance: feeler length px and steering push strength rad. */
	readonly avoidLookAhead: number;
	readonly avoidStrength: number;
	/** Own spine circles with index below this are exempt from avoidance. */
	readonly selfAvoidHeadExclusion: number;
	/** Avoidance strength multiplier when the threat is the worm's own body. */
	readonly ownBodyAvoidFactor: number;
	/** Seconds without progress toward the target before abandoning it. */
	readonly stuckTimeout: number;
	/** Seconds an abandoned food item stays blacklisted for this worm. */
	readonly retargetCooldown: number;
	/** Minimum px of approach that counts as progress. */
	readonly minProgress: number;
}

export interface EggConfig {
	/** Seconds until hatching: min + rand·spread. Original: 3s + rand·6s. */
	readonly hatchTimeMin: number;
	readonly hatchTimeSpread: number;
	/** Hatch pop animation duration, seconds. */
	readonly hatchBurstDuration: number;
	/** Radius growth factor per second. Original: 1.0038^60. */
	readonly growthPerSecond: number;
	/** Radius growth factor per second during the pop. Original: 1.4^60. */
	readonly burstGrowthPerSecond: number;
	readonly initialRadiusMin: number;
	readonly initialRadiusMax: number;
}

export interface FoodConfig {
	/** Nutritional value range (also the base radius). Original: 10 + rand·10. */
	readonly valueMin: number;
	readonly valueMax: number;
	readonly ringCount: number;
	/** Radius pulse: r·(1 + sin(pulseFreq·t)·pulseAmp). Original: t_ms/250. */
	readonly pulseFrequency: number;
	readonly pulseAmplitude: number;
	/** Keep-out margin from world edges when spawning. */
	readonly spawnMargin: number;
}

export interface WorldConfig {
	readonly width: number;
	readonly height: number;
	readonly seed: number;
	readonly initialWorms: number;
	readonly initialEggs: number;
	readonly foodCount: number;
	/** Width of the edge zone where worms slow down. */
	readonly edgeMargin: number;
	readonly worm: WormConfig;
	readonly egg: EggConfig;
	readonly food: FoodConfig;
}

export function defaultConfig(
	overrides: Partial<Pick<WorldConfig, "width" | "height" | "seed">> = {}
): WorldConfig {
	return {
		width: 800,
		height: 600,
		seed: 1,
		initialWorms: 2,
		initialEggs: 2,
		foodCount: 20,
		edgeMargin: 100,
		worm: {
			spine: {
				spacing: 5,
				bendTolerance: 0.4,
				widthRadiusFactor: 1.2,
				maxBendCap: Math.PI / 3,
			},
			initialLengthMin: 15,
			initialLengthMax: 25,
			baseWidthMin: 4,
			baseWidthMax: 9,
			maxSpeed: 120,
			speedGainPerDistance: 2.4,
			surgeFrequency: 10,
			turnRateCap: (4 * Math.PI * 60) / 360,
			eatRadius: 10,
			approachSlowRadius: 50,
			approachSlowFactor: 0.4,
			maxLengthBase: 37,
			maxLengthSpread: 3,
			dyingDuration: 3,
			growthLengthPerValue: 0.5,
			growthWidthPerValue: 1 / 3,
			growthSpeedPerValue: 1.875,
			avoidLookAhead: 90,
			avoidStrength: 1.2,
			selfAvoidHeadExclusion: 8,
			ownBodyAvoidFactor: 0.5,
			stuckTimeout: 3.5,
			retargetCooldown: 6,
			minProgress: 3,
		},
		egg: {
			hatchTimeMin: 3,
			hatchTimeSpread: 6,
			hatchBurstDuration: 0.2,
			growthPerSecond: Math.pow(1.0038, 60),
			burstGrowthPerSecond: Math.pow(1.4, 60),
			initialRadiusMin: 4,
			initialRadiusMax: 7,
		},
		food: {
			valueMin: 10,
			valueMax: 20,
			ringCount: 6,
			pulseFrequency: 4,
			pulseAmplitude: 0.1,
			spawnMargin: 100,
		},
		...overrides,
	};
}
