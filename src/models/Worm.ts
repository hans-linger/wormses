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
}

console.log("---worm!!!!!!!!!!!");

/**
 * Full worm with separate rings, pulsation, and proper visibility
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

	// Movement
	private headSpeed: number;
	private directionChangeInterval: number;
	private turnInertia: number;
	private headDirection: THREE.Vector3;
	private targetDirection: THREE.Vector3;
	private lastDirectionChange: number = 0;

	// Rendering - completely separate ring meshes
	private rings: Array<{
		mesh: THREE.Mesh;
		geometry: THREE.TorusGeometry;
		material: THREE.MeshBasicMaterial;
		segmentIndex: number;
	}> = [];

	private time: number = 0;

	constructor(scene: THREE.Scene, params: WormParams = {}) {
		this.scene = scene;

		console.log("🐛 Creating full worm...");

		// Parameters with good defaults for separate rings
		this.totalLength = params.totalLength || 20;
		this.segmentSpacing = params.segmentSpacing || 1.5; // Good spacing between rings
		this.ringRadius = params.ringRadius || 0.8;
		this.ringThickness = params.ringThickness || 0.12;
		this.pulsationAmplitude = params.pulsationAmplitude || 0.8; // Strong pulsation
		this.pulsationSpeed = params.pulsationSpeed || 2.5;
		this.headSpeed = params.headSpeed || 3.0;
		this.directionChangeInterval = params.directionChangeInterval || 4000;
		this.turnInertia = params.turnInertia || 0.02;
		this.colorFunction = params.colorFunction || colorFunctions.rainbow;

		this.numSegments = Math.floor(this.totalLength / this.segmentSpacing);

		// Movement initialization
		this.headDirection = new THREE.Vector3(1, 0, 0);
		this.targetDirection = new THREE.Vector3(1, 0, 0);

		// Create everything
		this.createSegments();
		this.createSeparateRings();

		console.log(`✅ Full worm created: ${this.rings.length} separate rings`);
	}

	/**
	 * Create worm spine segments
	 */
	private createSegments(): void {
		this.segments = [];

		for (let i = 0; i < this.numSegments; i++) {
			const position = new THREE.Vector3(-i * this.segmentSpacing, 0, 0);
			const tangent = new THREE.Vector3(1, 0, 0);
			const segment = new WormSegment(position, tangent);
			this.segments.push(segment);
		}

		console.log(`Created ${this.segments.length} spine segments`);
	}

	/**
	 * Create completely separate ring objects - ONE PER SEGMENT
	 */
	private createSeparateRings(): void {
		this.rings = [];

		for (let i = 0; i < this.segments.length; i++) {
			// Create unique geometry for this ring
			const geometry = new THREE.TorusGeometry(
				this.ringRadius,
				this.ringThickness,
				8, // Radial segments
				16 // Tubular segments
			);

			// Create unique material for this ring with initial color
			const hue = i / this.segments.length;
			const material = new THREE.MeshBasicMaterial({
				color: new THREE.Color().setHSL(hue, 0.8, 0.6),
				side: THREE.DoubleSide,
				transparent: false,
			});

			// Create unique mesh for this ring
			const mesh = new THREE.Mesh(geometry, material);
			mesh.name = `worm_ring_${i}`;
			mesh.frustumCulled = false; // Never hide this ring

			// Position ring at segment location
			mesh.position.copy(this.segments[i].position);

			// Add directly to scene
			this.scene.add(mesh);

			// Store ring info
			this.rings.push({
				mesh: mesh,
				geometry: geometry,
				material: material,
				segmentIndex: i,
			});
		}

		console.log(`Added ${this.rings.length} separate rings to scene`);
	}

	/**
	 * Update worm head movement
	 */
	private updateHeadMovement(deltaTime: number, currentTime: number): void {
		// Change direction occasionally
		if (currentTime - this.lastDirectionChange > this.directionChangeInterval) {
			this.pickNewDirection();
			this.lastDirectionChange = currentTime;
		}

		// Smooth direction interpolation
		this.headDirection.lerp(this.targetDirection, this.turnInertia);
		this.headDirection.normalize();

		// Move head forward
		const movement = this.headDirection
			.clone()
			.multiplyScalar(this.headSpeed * deltaTime);
		this.segments[0].position.add(movement);
		this.segments[0].tangent.copy(this.headDirection);
		this.segments[0].updateLocalFrame();
	}

	/**
	 * Pick new random direction
	 */
	private pickNewDirection(): void {
		const yaw = (Math.random() - 0.5) * Math.PI * 1.2;
		const pitch = (Math.random() - 0.5) * Math.PI * 0.6;

		this.targetDirection
			.set(
				Math.cos(pitch) * Math.cos(yaw),
				Math.sin(pitch),
				Math.cos(pitch) * Math.sin(yaw)
			)
			.normalize();

		console.log("🎯 Worm changing direction");
	}

	/**
	 * Update body segments to follow head
	 */
	private updateBodySegments(): void {
		for (let i = 1; i < this.segments.length; i++) {
			const current = this.segments[i];
			const leader = this.segments[i - 1];

			const direction = leader.position.clone().sub(current.position);
			const distance = direction.length();

			if (distance > this.segmentSpacing) {
				direction.normalize();
				const moveAmount = distance - this.segmentSpacing;
				current.position.add(
					direction.clone().multiplyScalar(moveAmount * 0.85)
				);
			}

			if (distance > 0.001) {
				current.tangent.copy(direction.normalize());
				current.updateLocalFrame();
			}
		}
	}

	/**
	 * Update ring positions with worm-like pulsation and animated colors
	 */
	private updateRings(): void {
		for (let i = 0; i < this.rings.length; i++) {
			const ring = this.rings[i];
			const segment = this.segments[ring.segmentIndex];
			const progress = i / (this.rings.length - 1); // 0 to 1 along worm

			// Base position from segment
			const basePosition = segment.position.clone();

			// WORM-LIKE PULSATION: Forward/backward movement along worm spine
			const pulsationPhase =
				progress * Math.PI * 5 + this.time * this.pulsationSpeed;
			const pulsationOffset =
				Math.sin(pulsationPhase) * this.pulsationAmplitude;

			// Apply pulsation along worm direction (like muscle contractions)
			const pulsatedPosition = basePosition
				.clone()
				.add(segment.tangent.clone().multiplyScalar(pulsationOffset));

			// Update ring position
			ring.mesh.position.copy(pulsatedPosition);

			// RING ORIENTATION: Perpendicular to worm direction
			const quaternion = new THREE.Quaternion();
			quaternion.setFromUnitVectors(
				new THREE.Vector3(0, 0, 1),
				segment.tangent
			);
			ring.mesh.setRotationFromQuaternion(quaternion);

			// ANIMATED COLOR GRADIENT: Head to tail with time animation
			const colorPhase = progress + this.time * 0.3; // Color wave travels along worm
			const baseHue = (colorPhase * 0.8) % 1.0; // Primary hue cycle
			const hueVariation =
				0.1 * Math.sin(this.time * 4 + progress * Math.PI * 8); // Subtle hue variation
			const finalHue = (baseHue + hueVariation) % 1.0;

			const saturation =
				0.85 + 0.1 * Math.sin(this.time * 2 + progress * Math.PI * 6);
			const lightness =
				0.5 + 0.3 * Math.sin(this.time * 3 + progress * Math.PI * 10);

			// Apply animated color
			ring.material.color.setHSL(finalHue, saturation, lightness);

			// Scale pulsation for extra effect
			const scalePulsation =
				1.0 + 0.15 * Math.sin(pulsationPhase + Math.PI * 0.5);
			ring.mesh.scale.setScalar(scalePulsation);
		}
	}

	/**
	 * Main update function
	 */
	update(deltaTime: number, currentTime: number): void {
		this.time += deltaTime;

		// Update worm physics
		this.updateHeadMovement(deltaTime, currentTime);
		this.updateBodySegments();

		// Update ring visuals
		this.updateRings();
	}

	/**
	 * Get head position for camera tracking
	 */
	getHeadPosition(): THREE.Vector3 {
		return this.segments[0].position.clone();
	}

	/**
	 * Get head direction
	 */
	getHeadDirection(): THREE.Vector3 {
		return this.headDirection.clone();
	}

	/**
	 * Clean up resources
	 */
	dispose(): void {
		console.log("🗑️ Disposing worm...");
		for (const ring of this.rings) {
			this.scene.remove(ring.mesh);
			ring.geometry.dispose();
			ring.material.dispose();
		}
		this.rings = [];
	}

	/**
	 * Set worm position
	 */
	setPosition(position: THREE.Vector3): void {
		const offset = position.clone().sub(this.segments[0].position);
		for (const segment of this.segments) {
			segment.position.add(offset);
		}
	}

	/**
	 * Set color function
	 */
	setColorFunction(colorFunc: ColorFunction): void {
		this.colorFunction = colorFunc;
	}

	/**
	 * Get available color functions
	 */
	static getColorFunctions() {
		return colorFunctions;
	}
}
