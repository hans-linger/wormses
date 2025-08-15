import * as THREE from "three";
import { WormSegment } from "./WormSegment";
import { ColorFunction, colorFunctions } from "./WormShaders";

export interface WormParams {
	totalLength?: number;
	segmentSpacing?: number;
	ringRadius?: number;
	ringThickness?: number;
	pulsationAmplitude?: number;
	pulsationSpeed?: number;
	headSpeed?: number;
	directionChangeInterval?: number;
	turnInertia?: number;
	colorFunction?: ColorFunction;
	frictionVariation?: number;
	maxFrictionSpeed?: number;
}

/**
 * PERFORMANCE OPTIMIZED: Enhanced worm using instanced rendering and efficient updates
 */
export class Worm {
	private scene: THREE.Scene;
	private segments: WormSegment[] = [];

	// Configuration
	private totalLength: number;
	private segmentSpacing: number;
	private ringRadius: number;
	private ringThickness: number;
	private pulsationAmplitude: number;
	private pulsationSpeed: number;
	private numSegments: number;
	private colorFunction: ColorFunction;
	private frictionVariation: number;
	private maxFrictionSpeed: number;

	// Movement
	private headSpeed: number;
	private directionChangeInterval: number;
	private turnInertia: number;
	private headDirection: THREE.Vector3;
	private targetDirection: THREE.Vector3;
	private lastDirectionChange: number = 0;

	// PERFORMANCE: Single instanced mesh instead of individual meshes
	private instancedMesh!: THREE.InstancedMesh;
	private ringGeometry!: THREE.TorusGeometry;
	private ringMaterial!: THREE.MeshBasicMaterial;

	// PERFORMANCE: Optimized ring data storage
	private rings: Array<{
		segmentIndex: number;
		frictionSpeed: number;
		velocity: THREE.Vector3;
		targetPosition: THREE.Vector3;
	}> = [];

	// PERFORMANCE: Pre-allocated objects for calculations
	private tempMatrix = new THREE.Matrix4();
	private tempQuaternion = new THREE.Quaternion();
	private tempVector3a = new THREE.Vector3();
	private tempVector3b = new THREE.Vector3();
	private tempColor = new THREE.Color();

	// PERFORMANCE: Update frequency controls
	private time: number = 0;
	private frameCount: number = 0;
	private readonly COLOR_UPDATE_FREQUENCY = 2; // Update colors every N frames
	private readonly PHYSICS_SUBSTEPS = 1; // Physics calculation frequency

	constructor(scene: THREE.Scene, params: WormParams = {}) {
		this.scene = scene;

		console.log("🐛 Creating SEXY REALISTIC worm...");

		// Parameters optimized for realistic solid worm appearance
		this.totalLength = params.totalLength || 20;
		this.segmentSpacing = params.segmentSpacing || 0.6; // Much tighter for solidity
		this.ringRadius = params.ringRadius || 0.5; // Slightly smaller
		this.ringThickness = params.ringThickness || 0.03; // Much thinner for realism
		this.pulsationAmplitude = params.pulsationAmplitude || 1.2; // Stronger for realistic crawling
		this.pulsationSpeed = params.pulsationSpeed || 1.8; // Slower, more realistic
		this.headSpeed = params.headSpeed || 2.5; // Slightly slower for realism
		this.directionChangeInterval = params.directionChangeInterval || 6000; // Less frequent changes
		this.turnInertia = params.turnInertia || 0.015; // Smoother turning
		this.colorFunction = params.colorFunction || colorFunctions.rainbow;
		this.frictionVariation = params.frictionVariation || 0.4; // Less variation for smoother appearance
		this.maxFrictionSpeed = params.maxFrictionSpeed || 0.8;

		this.numSegments = Math.floor(this.totalLength / this.segmentSpacing);

		// Movement initialization
		this.headDirection = new THREE.Vector3(1, 0, 0);
		this.targetDirection = new THREE.Vector3(1, 0, 0);

		// Create everything with realistic parameters
		this.createSegments();
		this.createSexyRealisticRings();

		console.log(
			`✨ SEXY worm created: ${this.rings.length} tightly packed rings for solid appearance`
		);
	}

	/**
	 * PERFORMANCE: Create segments with minimal allocations
	 */
	private createSegments(): void {
		this.segments.length = 0; // Clear without new allocation

		for (let i = 0; i < this.numSegments; i++) {
			const position = new THREE.Vector3(-i * this.segmentSpacing, 0, 0);
			const tangent = new THREE.Vector3(1, 0, 0);
			const segment = new WormSegment(position, tangent);
			this.segments.push(segment);
		}

		console.log(`⚡ Created ${this.segments.length} segments (optimized)`);
	}

	/**
	 * SEXY REALISM: Create semantically connected rings for solid worm appearance
	 */
	private createSexyRealisticRings(): void {
		// Create single geometry with higher detail for smooth appearance
		this.ringGeometry = new THREE.TorusGeometry(
			this.ringRadius,
			this.ringThickness,
			12, // Good balance of detail vs performance
			24 // Smooth circumference
		);

		// Single material optimized for realistic worm appearance
		this.ringMaterial = new THREE.MeshBasicMaterial({
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.95, // Slightly transparent for organic feel
			color: 0xffffff, // Base color modulated by instance colors
		});

		// Create instanced mesh
		this.instancedMesh = new THREE.InstancedMesh(
			this.ringGeometry,
			this.ringMaterial,
			this.segments.length
		);

		this.instancedMesh.frustumCulled = false;
		this.scene.add(this.instancedMesh);

		// SEMANTIC CONNECTION: Initialize colors and radii with smooth transitions
		const colors = new Float32Array(this.segments.length * 3);

		// Generate smooth base color for the entire worm (organic consistency)
		const wormBaseHue = Math.random(); // Random but consistent base color

		this.rings.length = 0;
		for (let i = 0; i < this.segments.length; i++) {
			const normalizedPosition = i / (this.segments.length - 1); // 0 to 1

			// SEMANTIC: Smooth friction distribution (head responsive, tail sluggish)
			const baseFriction = 0.8 - normalizedPosition * 0.6; // 0.8 at head, 0.2 at tail
			const smoothVariation =
				Math.sin(normalizedPosition * Math.PI) * this.frictionVariation * 0.3;
			const frictionSpeed = Math.max(
				-0.5,
				Math.min(0.8, baseFriction + smoothVariation)
			);

			// SEMANTIC: Smooth color transition along worm body
			const segmentHue = (wormBaseHue + normalizedPosition * 0.2) % 1.0; // Subtle hue variation
			const saturation = 0.7 + Math.sin(normalizedPosition * Math.PI) * 0.2; // Peak saturation in middle
			const lightness =
				0.4 + Math.cos(normalizedPosition * Math.PI * 0.5) * 0.3; // Lighter at head

			this.tempColor.setHSL(segmentHue, saturation, lightness);
			colors[i * 3] = this.tempColor.r;
			colors[i * 3 + 1] = this.tempColor.g;
			colors[i * 3 + 2] = this.tempColor.b;

			this.rings.push({
				segmentIndex: i,
				frictionSpeed: frictionSpeed,
				velocity: new THREE.Vector3(0, 0, 0),
				targetPosition: this.segments[i].position.clone(),
			});

			console.log(
				`Ring ${i}: friction=${frictionSpeed.toFixed(2)}, hue=${segmentHue.toFixed(2)}`
			);
		}

		this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
			colors,
			3
		);
		console.log(`✨ Created ${this.rings.length} semantically connected rings`);
	}

	/**
	 * PERFORMANCE: Optimized head movement with minimal allocations
	 */
	private updateHeadMovement(deltaTime: number, currentTime: number): void {
		// Direction change check
		if (currentTime - this.lastDirectionChange > this.directionChangeInterval) {
			this.pickNewDirection();
			this.lastDirectionChange = currentTime;
		}

		// Smooth direction interpolation (in-place)
		this.headDirection.lerp(this.targetDirection, this.turnInertia);
		this.headDirection.normalize();

		// Move head forward (reuse temp vector)
		this.tempVector3a
			.copy(this.headDirection)
			.multiplyScalar(this.headSpeed * deltaTime);
		this.segments[0].position.add(this.tempVector3a);
		this.segments[0].tangent.copy(this.headDirection);
		this.segments[0].updateLocalFrame();
	}

	/**
	 * PERFORMANCE: Optimized direction picking
	 */
	private pickNewDirection(): void {
		const yaw = (Math.random() - 0.5) * Math.PI * 1.2;
		const pitch = (Math.random() - 0.5) * Math.PI * 0.6;

		// Direct calculation, no intermediate objects
		this.targetDirection
			.set(
				Math.cos(pitch) * Math.cos(yaw),
				Math.sin(pitch),
				Math.cos(pitch) * Math.sin(yaw)
			)
			.normalize();
	}

	/**
	 * REALISTIC CRAWLING: Enhanced body segment physics with wave-like motion
	 */
	private updateBodySegments(): void {
		// CRAWLING SIMULATION: Create peristaltic waves like real worms
		for (let i = 1; i < this.segments.length; i++) {
			const current = this.segments[i];
			const leader = this.segments[i - 1];

			// Basic following behavior
			this.tempVector3a.subVectors(leader.position, current.position);
			const distance = this.tempVector3a.length();

			if (distance > this.segmentSpacing) {
				this.tempVector3a.normalize();

				// REALISTIC: Variable pull strength based on worm biology
				const pullStrength = Math.min(
					1.0,
					(distance - this.segmentSpacing) / this.segmentSpacing
				);

				// CRAWLING: Each segment responds differently based on "muscle strength"
				const normalizedPos = i / this.segments.length;
				const muscleStrength = 0.4 + 0.4 * Math.sin(normalizedPos * Math.PI); // Stronger in middle
				const segmentResponsiveness =
					muscleStrength * (0.6 + pullStrength * 0.4);

				const moveAmount =
					(distance - this.segmentSpacing) * segmentResponsiveness;

				this.tempVector3b.copy(this.tempVector3a).multiplyScalar(moveAmount);
				current.position.add(this.tempVector3b);
			}

			// REALISTIC: Smooth, organic orientation changes
			if (distance > 0.001) {
				this.tempVector3a.normalize();

				// Slower orientation change for more organic movement
				const orientationSpeed = 0.05 + (1 - i / this.segments.length) * 0.05; // Head faster than tail
				current.tangent.lerp(this.tempVector3a, orientationSpeed);
				current.tangent.normalize();
				current.updateLocalFrame();
			}
		}
	}

	/**
	 * SEXY REALISM: Highly optimized ring updates with semantic coherence
	 */
	private updateRings(): void {
		const updateColors = this.frameCount % this.COLOR_UPDATE_FREQUENCY === 0;

		// REALISTIC CRAWLING: Multiple wave patterns for complex motion
		const crawlWave1 =
			Math.sin(this.time * this.pulsationSpeed) * this.pulsationAmplitude;
		const crawlWave2 =
			Math.sin(this.time * this.pulsationSpeed * 1.3 + Math.PI) *
			this.pulsationAmplitude *
			0.6;

		for (let i = 0; i < this.rings.length; i++) {
			const ring = this.rings[i];
			const segment = this.segments[ring.segmentIndex];
			const progress = i / (this.rings.length - 1);

			// REALISTIC: Complex peristaltic motion with multiple waves
			const wavePhase1 =
				progress * Math.PI * 3 + this.time * this.pulsationSpeed;
			const wavePhase2 =
				progress * Math.PI * 4 +
				this.time * this.pulsationSpeed * 0.7 +
				Math.PI;

			// Combined wave motion for realistic crawling
			const primaryWave = Math.sin(wavePhase1) * this.pulsationAmplitude;
			const secondaryWave =
				Math.sin(wavePhase2) * this.pulsationAmplitude * 0.4;
			const pulsationOffset = primaryWave + secondaryWave;

			// SEMANTIC RADIUS: Smooth radius variation along worm body
			const baseRadiusMultiplier = 0.7 + 0.3 * Math.sin(progress * Math.PI); // Thicker in middle
			const breathingEffect =
				1 + 0.1 * Math.sin(this.time * 2 + progress * Math.PI * 2);
			const semanticRadius = baseRadiusMultiplier * breathingEffect;

			// Update target position with complex motion
			this.tempVector3a.copy(segment.tangent).multiplyScalar(pulsationOffset);
			ring.targetPosition.copy(segment.position).add(this.tempVector3a);

			// SEMANTIC PHYSICS: Neighboring rings influence each other
			this.instancedMesh.getMatrixAt(i, this.tempMatrix);
			this.tempVector3a.subVectors(
				ring.targetPosition,
				this.tempVector3a.setFromMatrixPosition(this.tempMatrix)
			);
			const distance = this.tempVector3a.length();

			if (distance > 0.001) {
				// Enhanced friction with neighbor influence
				const baseResponsiveness = 0.03 + (ring.frictionSpeed + 1) * 0.08;

				// SEMANTIC: Influence from neighboring rings for coherent motion
				let neighborInfluence = 0;
				if (i > 0)
					neighborInfluence += this.rings[i - 1].velocity.length() * 0.1;
				if (i < this.rings.length - 1)
					neighborInfluence += this.rings[i + 1].velocity.length() * 0.1;

				const totalResponsiveness = Math.min(
					0.2,
					baseResponsiveness + neighborInfluence
				);
				this.tempVector3b
					.copy(this.tempVector3a)
					.multiplyScalar(totalResponsiveness);

				// Update velocity with neighbor damping
				ring.velocity.add(this.tempVector3b).multiplyScalar(0.88); // Slightly more damping for smoothness

				// Apply position update
				this.instancedMesh.getMatrixAt(i, this.tempMatrix);
				this.tempVector3a
					.setFromMatrixPosition(this.tempMatrix)
					.add(ring.velocity);

				// SEMANTIC ORIENTATION: Smooth orientation following neighbors
				this.tempQuaternion.setFromUnitVectors(
					new THREE.Vector3(0, 0, 1),
					segment.tangent
				);

				// Apply semantic radius scaling
				const finalScale =
					semanticRadius +
					0.05 *
						Math.sin(wavePhase1 + Math.PI * 0.5) *
						(1 + ring.frictionSpeed * 0.1);

				// Update instance matrix
				this.tempMatrix.compose(
					this.tempVector3a,
					this.tempQuaternion,
					new THREE.Vector3(finalScale, finalScale, finalScale)
				);
				this.instancedMesh.setMatrixAt(i, this.tempMatrix);
			}

			// SEMANTIC COLORS: Smooth color transitions between neighbors
			if (updateColors) {
				const basePhase = this.time * 0.15; // Slower color changes for realism

				// SEMANTIC: Color influenced by position and neighbors
				const positionHue = (progress * 0.3 + basePhase) % 1.0;
				const organicSaturation =
					0.6 + 0.2 * Math.sin(progress * Math.PI * 2 + this.time);
				const organicLightness =
					0.4 + 0.3 * Math.cos(progress * Math.PI + this.time * 0.5);

				// Neighbor color blending for smooth transitions
				let finalHue = positionHue;
				if (i > 0) {
					const prevColor = new THREE.Color();
					this.instancedMesh.getColorAt(i - 1, prevColor);
					const prevHSL = { h: 0, s: 0, l: 0 };
					prevColor.getHSL(prevHSL);
					finalHue = (finalHue + prevHSL.h * 0.3) / 1.3; // Blend with previous
				}

				this.tempColor.setHSL(finalHue, organicSaturation, organicLightness);
				this.instancedMesh.setColorAt(i, this.tempColor);
			}
		}

		// Batch update notifications
		this.instancedMesh.instanceMatrix.needsUpdate = true;
		if (updateColors) {
			this.instancedMesh.instanceColor!.needsUpdate = true;
		}
	}

	/**
	 * PERFORMANCE: Main update with frame skipping and optimization
	 */
	update(deltaTime: number, currentTime: number): void {
		this.time += deltaTime;
		this.frameCount++;

		// Update physics every frame but with optimizations
		this.updateHeadMovement(deltaTime, currentTime);
		this.updateBodySegments();
		this.updateRings();
	}

	/**
	 * Get head position (optimized)
	 */
	getHeadPosition(): THREE.Vector3 {
		return this.segments[0].position;
	}

	/**
	 * Get head direction (optimized)
	 */
	getHeadDirection(): THREE.Vector3 {
		return this.headDirection;
	}

	/**
	 * PERFORMANCE: Optimized cleanup
	 */
	dispose(): void {
		console.log("🗑️ Disposing optimized worm...");
		this.scene.remove(this.instancedMesh);
		this.ringGeometry.dispose();
		this.ringMaterial.dispose();

		// Clear arrays
		this.rings.length = 0;
		this.segments.length = 0;
	}

	/**
	 * Set worm position (optimized)
	 */
	setPosition(position: THREE.Vector3): void {
		this.tempVector3a.subVectors(position, this.segments[0].position);
		for (const segment of this.segments) {
			segment.position.add(this.tempVector3a);
		}
	}

	/**
	 * PERFORMANCE: Get performance stats
	 */
	getPerformanceStats(): {
		ringCount: number;
		geometryVertices: number;
		drawCalls: number;
	} {
		return {
			ringCount: this.rings.length,
			geometryVertices: this.ringGeometry.attributes.position.count,
			drawCalls: 1, // Instanced mesh = 1 draw call for all rings
		};
	}

	/**
	 * PERFORMANCE: Adjust quality settings at runtime
	 */
	setQualityLevel(level: "low" | "medium" | "high"): void {
		// This would require recreating geometry, so just log for now
		console.log(`Quality level change requested: ${level} (requires restart)`);
	}

	// Keep existing methods for compatibility
	setColorFunction(colorFunc: ColorFunction): void {
		this.colorFunction = colorFunc;
	}

	getRingFrictionSpeeds(): number[] {
		return this.rings.map(ring => ring.frictionSpeed);
	}

	setRingFrictionSpeed(ringIndex: number, frictionSpeed: number): void {
		if (ringIndex >= 0 && ringIndex < this.rings.length) {
			this.rings[ringIndex].frictionSpeed = Math.max(
				-1,
				Math.min(1, frictionSpeed)
			);
		}
	}

	static getColorFunctions() {
		return colorFunctions;
	}
}
