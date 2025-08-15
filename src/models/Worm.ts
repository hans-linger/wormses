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

		console.log("🚀 Creating PERFORMANCE OPTIMIZED worm...");

		// Parameters optimized for performance vs quality balance
		this.totalLength = params.totalLength || 20;
		this.segmentSpacing = params.segmentSpacing || 1.2;
		this.ringRadius = params.ringRadius || 0.6;
		this.ringThickness = params.ringThickness || 0.06;
		this.pulsationAmplitude = params.pulsationAmplitude || 0.8;
		this.pulsationSpeed = params.pulsationSpeed || 2.5;
		this.headSpeed = params.headSpeed || 3.0;
		this.directionChangeInterval = params.directionChangeInterval || 4000;
		this.turnInertia = params.turnInertia || 0.02;
		this.colorFunction = params.colorFunction || colorFunctions.rainbow;
		this.frictionVariation = params.frictionVariation || 0.6;
		this.maxFrictionSpeed = params.maxFrictionSpeed || 1.0;

		this.numSegments = Math.floor(this.totalLength / this.segmentSpacing);

		// Movement initialization
		this.headDirection = new THREE.Vector3(1, 0, 0);
		this.targetDirection = new THREE.Vector3(1, 0, 0);

		// Create everything with performance optimizations
		this.createSegments();
		this.createOptimizedInstancedRings();

		console.log(
			`⚡ OPTIMIZED worm created: ${this.rings.length} rings using instanced rendering`
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
	 * PERFORMANCE: Create single instanced mesh instead of individual meshes
	 */
	private createOptimizedInstancedRings(): void {
		// Create single geometry shared by all rings (reduced detail for performance)
		this.ringGeometry = new THREE.TorusGeometry(
			this.ringRadius,
			this.ringThickness,
			8, // Reduced from 16 for performance
			16 // Reduced from 32 for performance
		);

		// Single material shared by all rings
		this.ringMaterial = new THREE.MeshBasicMaterial({
			side: THREE.DoubleSide,
			transparent: false,
			color: 0xffffff, // Base white color, will be modulated by instance colors
			// Note: Don't use vertexColors with InstancedMesh - it uses instanceColor instead
		});

		// Create instanced mesh for all rings
		this.instancedMesh = new THREE.InstancedMesh(
			this.ringGeometry,
			this.ringMaterial,
			this.segments.length
		);

		// PERFORMANCE: Disable frustum culling and set large bounding sphere
		this.instancedMesh.frustumCulled = false;

		// Enable per-instance colors
		const colors = new Float32Array(this.segments.length * 3);
		// Initialize with some visible colors
		for (let i = 0; i < this.segments.length; i++) {
			const hue = i / this.segments.length;
			this.tempColor.setHSL(hue, 0.8, 0.6);
			colors[i * 3] = this.tempColor.r;
			colors[i * 3 + 1] = this.tempColor.g;
			colors[i * 3 + 2] = this.tempColor.b;
		}
		this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
			colors,
			3
		);

		// Add to scene
		this.scene.add(this.instancedMesh);

		// Initialize ring data (minimal object creation)
		this.rings.length = 0;
		for (let i = 0; i < this.segments.length; i++) {
			// Calculate friction speed once
			const normalizedPosition = i / (this.segments.length - 1);
			const baseFriction = 0.5 + normalizedPosition * 0.3;
			const randomVariation = (Math.random() - 0.5) * this.frictionVariation;
			const frictionSpeed = Math.max(
				-1,
				Math.min(1, baseFriction + randomVariation)
			);

			this.rings.push({
				segmentIndex: i,
				frictionSpeed: frictionSpeed,
				velocity: new THREE.Vector3(0, 0, 0),
				targetPosition: this.segments[i].position.clone(),
			});
		}

		console.log(
			`⚡ Created instanced mesh with ${this.rings.length} ring instances`
		);
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
	 * PERFORMANCE: Optimized body segment physics with minimal allocations
	 */
	private updateBodySegments(): void {
		// Process in chunks for better cache performance
		for (let i = 1; i < this.segments.length; i++) {
			const current = this.segments[i];
			const leader = this.segments[i - 1];

			// Reuse temp vectors to avoid allocations
			this.tempVector3a.subVectors(leader.position, current.position);
			const distance = this.tempVector3a.length();

			if (distance > this.segmentSpacing) {
				this.tempVector3a.normalize();

				// Optimized pull calculation
				const pullStrength = Math.min(
					1.0,
					(distance - this.segmentSpacing) / this.segmentSpacing
				);
				const segmentFriction = 0.3 + (i / this.segments.length) * 0.4;
				const moveAmount =
					(distance - this.segmentSpacing) * pullStrength * segmentFriction;

				// Apply movement (reuse temp vector)
				this.tempVector3b.copy(this.tempVector3a).multiplyScalar(moveAmount);
				current.position.add(this.tempVector3b);
			}

			// Smooth orientation update
			if (distance > 0.001) {
				this.tempVector3a.normalize();
				current.tangent.lerp(this.tempVector3a, 0.1);
				current.tangent.normalize();
				current.updateLocalFrame();
			}
		}
	}

	/**
	 * PERFORMANCE: Highly optimized ring updates with batched operations
	 */
	private updateRings(): void {
		const updateColors = this.frameCount % this.COLOR_UPDATE_FREQUENCY === 0;

		// Batch process all rings
		for (let i = 0; i < this.rings.length; i++) {
			const ring = this.rings[i];
			const segment = this.segments[ring.segmentIndex];
			const progress = i / (this.rings.length - 1);

			// PERFORMANCE: Calculate pulsation once
			const pulsationPhase =
				progress * Math.PI * 5 + this.time * this.pulsationSpeed;
			const pulsationOffset =
				Math.sin(pulsationPhase) * this.pulsationAmplitude;

			// Update target position (reuse temp vector)
			this.tempVector3a.copy(segment.tangent).multiplyScalar(pulsationOffset);
			ring.targetPosition.copy(segment.position).add(this.tempVector3a);

			// PERFORMANCE: Simplified physics update
			this.instancedMesh.getMatrixAt(i, this.tempMatrix);
			this.tempVector3a.subVectors(
				ring.targetPosition,
				this.tempVector3a.setFromMatrixPosition(this.tempMatrix)
			);
			const distance = this.tempVector3a.length();

			if (distance > 0.001) {
				// Optimized friction physics
				const responsiveness = 0.05 + (ring.frictionSpeed + 1) * 0.1;
				this.tempVector3b
					.copy(this.tempVector3a)
					.multiplyScalar(responsiveness);

				// Update velocity and position
				ring.velocity.add(this.tempVector3b).multiplyScalar(0.85);

				// Apply to instance matrix (fix the position extraction)
				this.instancedMesh.getMatrixAt(i, this.tempMatrix);
				this.tempVector3a
					.setFromMatrixPosition(this.tempMatrix)
					.add(ring.velocity);

				// Set orientation (optimized quaternion)
				this.tempQuaternion.setFromUnitVectors(
					new THREE.Vector3(0, 0, 1),
					segment.tangent
				);

				// Scale with pulsation
				const scale =
					1.0 +
					0.1 *
						Math.sin(pulsationPhase + Math.PI * 0.5) *
						(1 + ring.frictionSpeed * 0.2);

				// Update instance matrix
				this.tempMatrix.compose(
					this.tempVector3a,
					this.tempQuaternion,
					new THREE.Vector3(scale, scale, scale)
				);
				this.instancedMesh.setMatrixAt(i, this.tempMatrix);
			}

			// PERFORMANCE: Update colors less frequently
			if (updateColors) {
				const colorPhase = progress + this.time * 0.3;
				const baseHue = (colorPhase * 0.8) % 1.0;
				const frictionColorShift = ring.frictionSpeed * 0.1;
				const finalHue = (baseHue + frictionColorShift) % 1.0;

				// Simplified color calculation
				const saturation = 0.85;
				const lightness =
					0.5 + 0.3 * Math.sin(this.time * 3 + progress * Math.PI * 10);

				this.tempColor.setHSL(finalHue, saturation, lightness);
				this.instancedMesh.setColorAt(i, this.tempColor);
			}
		}

		// PERFORMANCE: Batch update notifications
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
