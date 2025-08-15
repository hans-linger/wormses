import * as THREE from "three";

/**
 * Represents a single segment of the worm with position, direction, and local coordinate system
 * Each segment maintains its own tangent-normal-binormal frame for spiral generation
 */
export class WormSegment {
	public position: THREE.Vector3;
	public tangent: THREE.Vector3;
	public normal: THREE.Vector3 = new THREE.Vector3();
	public binormal: THREE.Vector3 = new THREE.Vector3();
	public radius: number = 1.0;

	constructor(
		position: THREE.Vector3 = new THREE.Vector3(),
		tangent: THREE.Vector3 = new THREE.Vector3(0, 0, 1)
	) {
		this.position = position.clone();
		this.tangent = tangent.clone().normalize();
		this.normal = new THREE.Vector3();
		this.binormal = new THREE.Vector3();
		this.radius = 1.0;

		// Initialize local coordinate system
		this.updateLocalFrame();
	}

	/**
	 * Updates the local coordinate frame (tangent, normal, binormal) for spiral generation
	 * This creates a consistent orthonormal basis around the segment's tangent direction
	 */
	updateLocalFrame(): void {
		// Create a consistent normal vector perpendicular to tangent
		// Avoid singularity when tangent is parallel to world Y-axis
		if (Math.abs(this.tangent.y) < 0.9) {
			this.normal.set(0, 1, 0).cross(this.tangent).normalize();
		} else {
			this.normal.set(1, 0, 0).cross(this.tangent).normalize();
		}

		// Binormal completes the right-handed orthonormal frame
		this.binormal.crossVectors(this.tangent, this.normal).normalize();
	}

	/**
	 * Generates a point on the spiral around this segment's local tangent
	 * @param angle - Angle around the spiral (0 to 2π)
	 * @param radius - Radius of the spiral at this point
	 * @returns World position of the spiral point
	 */
	getSpiralPoint(angle: number, radius: number): THREE.Vector3 {
		// Create spiral point in local coordinates
		const localPoint = new THREE.Vector3(
			radius * Math.cos(angle),
			radius * Math.sin(angle),
			0
		);

		// Transform to world coordinates using local frame
		const worldPoint = new THREE.Vector3();
		worldPoint.addScaledVector(this.normal, localPoint.x);
		worldPoint.addScaledVector(this.binormal, localPoint.y);
		worldPoint.add(this.position);

		return worldPoint;
	}
}
