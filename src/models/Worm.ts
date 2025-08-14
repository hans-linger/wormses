import * as THREE from "three";
import { FdR, radiusFromKeys, RadiusKey } from "../helpers/interpolations";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";

export interface WormParams {
	totalLength: number; // total length of worm
	baseRadiusKeys: RadiusKey[];
	fdR: FdR;
	speed?: number;
	inertia?: number;
	spiralLoops?: number; // loops along each segment
	pointsPerLoop?: number; // resolution
	pulseAmplitude?: number;
	segmentCount?: number; // number of segments along worm
}

export class Worm {
	public line: Line2;
	private params: Required<WormParams>;

	private segmentPositions: THREE.Vector3[]; // head-to-tail positions
	private segmentDirs: THREE.Vector3[]; // current direction of each segment

	private geometry: LineGeometry;
	private positions: Float32Array;
	private widths: Float32Array;

	private clock = new THREE.Clock();
	private nextTurnTime = 0;
	private headDir = new THREE.Vector3(0, 0, 1);

	constructor(p: WormParams, resolution: THREE.Vector2) {
		this.params = {
			totalLength: p.totalLength,
			baseRadiusKeys: p.baseRadiusKeys,
			fdR: p.fdR,
			speed: p.speed ?? 2.2,
			inertia: p.inertia ?? 0.9,
			spiralLoops: p.spiralLoops ?? 12,
			pointsPerLoop: p.pointsPerLoop ?? 8,
			pulseAmplitude: p.pulseAmplitude ?? 0.3,
			segmentCount: p.segmentCount ?? 72,
		};

		// Initialize segment positions and directions (straight line along Z)
		this.segmentPositions = [];
		this.segmentDirs = [];
		const segLength = this.params.totalLength / (this.params.segmentCount - 1);
		for (let i = 0; i < this.params.segmentCount; i++) {
			this.segmentPositions.push(new THREE.Vector3(0, 0, i * segLength));
			this.segmentDirs.push(new THREE.Vector3(0, 0, 1));
		}

		// Geometry
		this.positions = new Float32Array(this.params.segmentCount * 3);
		this.widths = new Float32Array(this.params.segmentCount);

		this.geometry = new LineGeometry();
		this.geometry.setPositions(this.positions);
		this.geometry.setAttribute(
			"instanceDistanceStart",
			new THREE.Float32BufferAttribute(this.widths, 1)
		);

		this.material = new LineMaterial({
			color: 0xffaa55,
			linewidth: 2,
			vertexColors: false,
			dashed: false,
			resolution,
		});

		this.line = new Line2(this.geometry, this.material);
		this.line.computeLineDistances();
	}

	public material: LineMaterial;

	private scheduleNextTurn() {
		const now = this.clock.getElapsedTime();
		const dt = 1.0 + Math.random() * 2.0;
		this.nextTurnTime = now + dt;

		// Random new head direction (yaw/pitch)
		const yaw = (Math.random() * 2 - 1) * Math.PI * 0.5;
		const pitch = (Math.random() * 2 - 1) * Math.PI * 0.2;
		const q = new THREE.Quaternion().setFromEuler(
			new THREE.Euler(pitch, yaw, 0, "YXZ")
		);
		this.headDir
			.copy(this.segmentDirs[this.segmentDirs.length - 1])
			.applyQuaternion(q)
			.normalize();
	}

	update() {
		const dt = this.clock.getDelta();
		const time = this.clock.getElapsedTime();
		const segCount = this.params.segmentCount;

		// --- Head movement ---
		if (time >= this.nextTurnTime) this.scheduleNextTurn();

		const headPos = this.segmentPositions[segCount - 1];
		const headDir = this.segmentDirs[segCount - 1];

		headDir.lerp(this.headDir, 1 - this.params.inertia).normalize();
		headPos.addScaledVector(headDir, this.params.speed * dt);

		// --- Body follows head ---
		const segLength = this.params.totalLength / (segCount - 1);
		for (let i = segCount - 2; i >= 0; i--) {
			const next = this.segmentPositions[i + 1];
			const p = this.segmentPositions[i];
			const dir = new THREE.Vector3().subVectors(next, p);
			const dist = dir.length() || 1e-6;
			dir.normalize().multiplyScalar(dist - segLength);
			p.add(dir);
			this.segmentDirs[i].lerp(dir, 0.5).normalize();
		}

		// --- Spiral & pulsation per segment ---
		for (let i = 0; i < segCount; i++) {
			const segPos = this.segmentPositions[i];
			const tangent = this.segmentDirs[i];

			// Create orthonormal frame
			const normal = new THREE.Vector3(0, 1, 0);
			if (Math.abs(tangent.dot(normal)) > 0.99) normal.set(1, 0, 0);
			const binormal = new THREE.Vector3()
				.crossVectors(tangent, normal)
				.normalize();
			normal.crossVectors(binormal, tangent).normalize();

			const t = i / (segCount - 1);
			const baseR = radiusFromKeys(
				this.params.baseRadiusKeys,
				this.params.fdR,
				t * this.params.totalLength
			);
			const pulse =
				1 + this.params.pulseAmplitude * Math.sin(time * 4 + t * 12);
			const radius = baseR * pulse;

			// Spiral angle along worm
			const angle = t * Math.PI * 2 * this.params.spiralLoops + time * 2.0;
			const offset = new THREE.Vector3()
				.addScaledVector(normal, Math.cos(angle) * radius)
				.addScaledVector(binormal, Math.sin(angle) * radius);

			this.positions[i * 3] = segPos.x + offset.x;
			this.positions[i * 3 + 1] = segPos.y + offset.y;
			this.positions[i * 3 + 2] = segPos.z + offset.z;

			this.widths[i] = Math.max(0.001, baseR);
		}

		// --- Update geometry ---
		this.geometry.setPositions(this.positions);
		this.geometry.setAttribute(
			"instanceDistanceStart",
			new THREE.Float32BufferAttribute(this.widths, 1)
		);
		(this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate =
			true;
		(
			this.geometry.attributes.instanceDistanceStart as THREE.BufferAttribute
		).needsUpdate = true;
		this.line.computeLineDistances();
	}
}
