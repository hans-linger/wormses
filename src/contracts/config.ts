/**
 * Configuration contracts. Values live in `src/config/defaults.ts`; only the
 * shapes are declared here.
 *
 * All units are world pixels and seconds. Per-frame constants from the
 * original 60fps code are converted to per-second equivalents (×60).
 */

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

export interface WormConfig {
	readonly spine: SpineParams;
	/** Starting segment count range. Original: 15 + rand·10. */
	readonly initialLengthMin: number;
	readonly initialLengthMax: number;
	/** Base body width range. Original: 4 + rand·5. */
	readonly baseWidthMin: number;
	readonly baseWidthMax: number;
	/**
	 * Hard ceiling on base width however much width-food is eaten. Without
	 * it a lucky worm becomes an unnavigable blob that nothing can avoid.
	 */
	readonly baseWidthCap: number;
	/** Max speed, px/s. Original: 2 px/frame. */
	readonly maxSpeed: number;
	/** Speed gained per px of target distance, 1/s. Original: 0.04/frame. */
	readonly speedGainPerDistance: number;
	/** Peristaltic surge: speed × (1 + sin(surgeFreq·t)). Original: t_ms/100. */
	readonly surgeFrequency: number;
	/** Absolute turn-rate cap, rad/s. Original: 4π/360 rad/frame. */
	readonly turnRateCap: number;
	/** Distance at which food is eaten (floor; item radius may exceed it). */
	readonly eatRadius: number;
	/** Distance at which approach slows. */
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
	/** px/s of max speed per unit of power-food value. */
	readonly growthSpeedPerValue: number;
	/** Predictive avoidance: minimum feeler length px, push strength rad. */
	readonly avoidLookAhead: number;
	readonly avoidStrength: number;
	/**
	 * The feeler grows with the body: a wide worm commits its whole length to
	 * the head's path, so it must spot obstacles body-radius multiples ahead
	 * and with enough seconds of travel to turn away in time.
	 */
	readonly avoidRadiusFactor: number;
	readonly avoidReactionTime: number;
	/** Own spine circles with index below this are exempt from avoidance. */
	readonly selfAvoidHeadExclusion: number;
	/** Avoidance strength multiplier when the threat is the worm's own body. */
	readonly ownBodyAvoidFactor: number;
	/** Seconds without progress toward the target before abandoning it. */
	readonly stuckTimeout: number;
	/** Seconds an abandoned food item stays blacklisted for this worm. */
	readonly retargetCooldown: number;
	/** Gap under which a foreign body pushes this worm aside, px. */
	readonly separationRange: number;
	/** Strength of that sideways push, radians at full crowding. */
	readonly separationStrength: number;
	/** How many of the nearest food items a worm will consider. */
	readonly foragingCandidates: number;
	/** Bias toward the nearest candidate: 1 = uniform, higher = greedier. */
	readonly foragingBias: number;
	/** Minimum px of approach that counts as progress. */
	readonly minProgress: number;
}

export interface EggConfig {
	/** Seconds until hatching: min + rand·spread. */
	readonly hatchTimeMin: number;
	readonly hatchTimeSpread: number;
	/** Hatch pop animation duration, seconds. */
	readonly hatchBurstDuration: number;
	/** Radius growth factor per second. */
	readonly growthPerSecond: number;
	/** Radius growth factor per second during the pop. */
	readonly burstGrowthPerSecond: number;
	readonly initialRadiusMin: number;
	readonly initialRadiusMax: number;
}

export interface FoodConfig {
	/** Nutritional value range (also the base radius). */
	readonly valueMin: number;
	readonly valueMax: number;
	readonly ringCount: number;
	/** Radius pulse: r·(1 + sin(pulseFreq·t)·pulseAmp). */
	readonly pulseFrequency: number;
	readonly pulseAmplitude: number;
	/** Keep-out margin from world edges when spawning. */
	readonly spawnMargin: number;
}

export interface PhysicsConfig {
	/** Position-correction iterations per tick. */
	readonly iterations: number;
	/**
	 * Iterations for pushing passive bodies (food, eggs) out of worms. Higher
	 * than `iterations` because escaping the middle of a long body means
	 * stepping out of one segment and into the next, repeatedly.
	 */
	readonly passiveIterations: number;
	/** Fraction of an overlap resolved per iteration (0–1, softness). */
	readonly stiffness: number;
	/** Extra gap kept between touching bodies, px. */
	readonly separationSlack: number;
	/**
	 * Hard cap on how far one iteration may move a body, px. Without it two
	 * deeply overlapping bodies feed each other ever larger corrections and
	 * the simulation explodes — deep overlaps instead ease apart over several
	 * ticks, which also looks better.
	 */
	readonly maxCorrection: number;
	/**
	 * Own spine circles within this many indices of the segment being
	 * resolved are skipped — neighbors always overlap by construction.
	 */
	readonly selfContactExclusion: number;
	/** Cell size of the uniform spatial hash grid, px. */
	/**
	 * Segments at the eater's head that may overlap the meal they are
	 * chasing. Beyond this window the body shoves food aside like any
	 * other worm would, so an abandoned item is never left buried.
	 */
	readonly eaterHeadExemption: number;
	readonly gridCellSize: number;
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
	/** Rejection-sampling attempts when looking for a clear spawn spot. */
	readonly spawnAttempts: number;
	readonly worm: WormConfig;
	readonly egg: EggConfig;
	readonly food: FoodConfig;
	readonly physics: PhysicsConfig;
}
