import type { WorldConfig } from "../contracts/config";

/**
 * Default tuning of the whole simulation. Shapes are declared in
 * `src/contracts/config.ts`; this file holds only values.
 */
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
		spawnAttempts: 24,
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
			baseWidthCap: 18,
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
			avoidRadiusFactor: 2.5,
			avoidReactionTime: 0.6,
			selfAvoidHeadExclusion: 8,
			ownBodyAvoidFactor: 0.5,
			stuckTimeout: 3.5,
			retargetCooldown: 6,
			separationRange: 28,
			separationStrength: 1.5,
			foragingCandidates: 4,
			foragingBias: 2,
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
		physics: {
			iterations: 3,
			passiveIterations: 16,
			stiffness: 0.85,
			separationSlack: 0.5,
			maxCorrection: 4,
			selfContactExclusion: 4,
			eaterHeadExemption: 5,
			gridCellSize: 40,
		},
		...overrides,
	};
}
