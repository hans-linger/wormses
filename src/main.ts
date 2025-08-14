import * as THREE from "three";
import { Worm } from "./models/Worm";
import { fdR_cosine } from "./helpers/interpolations";

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e13);

const camera = new THREE.PerspectiveCamera(
	60,
	window.innerWidth / window.innerHeight,
	0.1,
	2000
);
camera.position.set(0, 3, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.style.margin = "0";
document.body.appendChild(renderer.domElement);

// --- Lights ---
const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.6);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(8, 15, 8);
dir.castShadow = true;
scene.add(dir);

// --- Ground ---
const plane = new THREE.Mesh(
	new THREE.PlaneGeometry(200, 200),
	new THREE.MeshStandardMaterial({
		color: 0x11151a,
		metalness: 0,
		roughness: 0.95,
	})
);
plane.rotation.x = -Math.PI / 2;
plane.receiveShadow = true;
scene.add(plane);

// --- Worm ---
const worm = new Worm(
	{
		totalLength: 12,
		baseRadiusKeys: [
			{ h: 0, r: 0.05 },
			{ h: 12, r: 0.05 },
		],
		fdR: fdR_cosine,
		spiralLoops: 12,
		pointsPerLoop: 8,
		pulseAmplitude: 0.3,
		segmentCount: 72,
	},
	new THREE.Vector2(window.innerWidth, window.innerHeight)
);
scene.add(worm.line);

// --- WASD + pointer lock FPS controls ---
let pointerLocked = false;
const keys: Record<string, boolean> = {};
const moveSpeed = 10;
const lookSpeed = 0.002;
let yaw = 0;
let pitch = 0;

document.addEventListener("keydown", e => {
	keys[e.key.toLowerCase()] = true;
});
document.addEventListener("keyup", e => {
	keys[e.key.toLowerCase()] = false;
});

renderer.domElement.addEventListener("click", () => {
	renderer.domElement.requestPointerLock();
});

document.addEventListener("pointerlockchange", () => {
	pointerLocked = document.pointerLockElement === renderer.domElement;
});

document.addEventListener("mousemove", e => {
	if (!pointerLocked) return;
	yaw -= e.movementX * lookSpeed;
	pitch -= e.movementY * lookSpeed;
	pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
});

function updateCamera(dt: number) {
	if (!pointerLocked) return;

	// FPS-style forward/right/up
	const forward = new THREE.Vector3(
		Math.sin(yaw),
		0,
		Math.cos(yaw)
	).normalize();
	const right = new THREE.Vector3()
		.crossVectors(forward, new THREE.Vector3(0, 1, 0))
		.normalize();
	const up = new THREE.Vector3(0, 1, 0);

	if (keys["w"]) camera.position.addScaledVector(forward, moveSpeed * dt);
	if (keys["s"]) camera.position.addScaledVector(forward, -moveSpeed * dt);
	if (keys["a"]) camera.position.addScaledVector(right, -moveSpeed * dt);
	if (keys["d"]) camera.position.addScaledVector(right, moveSpeed * dt);
	if (keys[" "]) camera.position.addScaledVector(up, moveSpeed * dt);
	if (keys["shift"]) camera.position.addScaledVector(up, -moveSpeed * dt);

	const lookDir = new THREE.Vector3(
		Math.cos(pitch) * Math.sin(yaw),
		Math.sin(pitch),
		Math.cos(pitch) * Math.cos(yaw)
	).normalize();

	camera.lookAt(camera.position.clone().add(lookDir));
}

// --- Animate ---
const clock = new THREE.Clock();

function animate() {
	requestAnimationFrame(animate);
	const dt = clock.getDelta();

	worm.update();
	updateCamera(dt);
	renderer.render(scene, camera);
}
animate();

// --- Resize handler ---
window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);

	worm.material.resolution.set(window.innerWidth, window.innerHeight);
	worm.material.needsUpdate = true;
});
