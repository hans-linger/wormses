import * as THREE from "three";

/**
 * FPS-style camera controller with WASD movement and mouse look
 * Provides smooth first-person movement through 3D space
 */
export class FPSCamera {
	private camera: THREE.PerspectiveCamera;
	private domElement: HTMLElement;

	// Movement state tracking
	private keys = {
		forward: false,
		backward: false,
		left: false,
		right: false,
		up: false,
		down: false,
	};

	// Mouse look state
	private yaw: number = 0;
	private pitch: number = 0;
	private mouseSensitivity: number = 0.002;
	private moveSpeed: number = 10;

	// Pointer lock state
	private isLocked: boolean = false;

	constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
		this.camera = camera;
		this.domElement = domElement;
		this.setupEventListeners();
	}

	/**
	 * Sets up all input event listeners for keyboard and mouse
	 */
	private setupEventListeners(): void {
		// Keyboard events for movement
		document.addEventListener("keydown", e => this.onKeyDown(e));
		document.addEventListener("keyup", e => this.onKeyUp(e));

		// Mouse events for look controls
		document.addEventListener("click", () => this.requestPointerLock());
		document.addEventListener("pointerlockchange", () =>
			this.onPointerLockChange()
		);
		document.addEventListener("mousemove", e => this.onMouseMove(e));

		// Handle escape key to exit pointer lock
		document.addEventListener("keydown", e => {
			if (e.code === "Escape" && this.isLocked) {
				document.exitPointerLock();
			}
		});
	}

	/**
	 * Handles key press events for movement
	 */
	private onKeyDown(event: KeyboardEvent): void {
		switch (event.code) {
			case "KeyW":
				this.keys.forward = true;
				break;
			case "KeyS":
				this.keys.backward = true;
				break;
			case "KeyA":
				this.keys.left = true;
				break;
			case "KeyD":
				this.keys.right = true;
				break;
			case "Space":
				this.keys.up = true;
				event.preventDefault(); // Prevent page scroll
				break;
			// case "ShiftLeft":
			// 	this.keys.down = true;
			// 	break;
		}
	}

	/**
	 * Handles key release events for movement
	 */
	private onKeyUp(event: KeyboardEvent): void {
		switch (event.code) {
			case "KeyW":
				this.keys.forward = false;
				break;
			case "KeyS":
				this.keys.backward = false;
				break;
			case "KeyA":
				this.keys.left = false;
				break;
			case "KeyD":
				this.keys.right = false;
				break;
			case "Space":
				this.keys.up = false;
				break;
			// case "ShiftLeft":
			// 	this.keys.down = false;
			// 	break;
		}
	}

	/**
	 * Requests pointer lock for mouse look functionality
	 */
	private requestPointerLock(): void {
		this.domElement.requestPointerLock();
	}

	/**
	 * Handles pointer lock state changes
	 */
	private onPointerLockChange(): void {
		this.isLocked = document.pointerLockElement === this.domElement;
	}

	/**
	 * Handles mouse movement for look controls
	 */
	private onMouseMove(event: MouseEvent): void {
		if (!this.isLocked) return;

		// Update yaw and pitch based on mouse movement
		this.yaw -= event.movementX * this.mouseSensitivity;
		this.pitch -= event.movementY * this.mouseSensitivity;

		// Clamp pitch to prevent camera flipping
		this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
	}

	/**
	 * Updates camera position and rotation based on input state
	 * @param deltaTime - Time elapsed since last frame in seconds
	 */
	update(deltaTime: number): void {
		// Update camera rotation from mouse input
		this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");

		// Calculate movement vector in local space
		const moveVector = new THREE.Vector3();

		if (this.keys.forward) moveVector.z -= 1;
		if (this.keys.backward) moveVector.z += 1;
		if (this.keys.left) moveVector.x -= 1;
		if (this.keys.right) moveVector.x += 1;
		if (this.keys.up) moveVector.y += 1;
		if (this.keys.down) moveVector.y -= 1;

		// Normalize movement vector to prevent faster diagonal movement
		if (moveVector.length() > 0) {
			moveVector.normalize();
		}

		// Apply camera rotation to movement vector (transform to world space)
		moveVector.applyQuaternion(this.camera.quaternion);
		moveVector.multiplyScalar(this.moveSpeed * deltaTime);

		// Apply movement to camera position
		this.camera.position.add(moveVector);
	}

	/**
	 * Gets current camera position
	 */
	getPosition(): THREE.Vector3 {
		return this.camera.position.clone();
	}

	/**
	 * Sets camera position
	 */
	setPosition(position: THREE.Vector3): void {
		this.camera.position.copy(position);
	}

	/**
	 * Sets movement speed
	 */
	setMoveSpeed(speed: number): void {
		this.moveSpeed = speed;
	}

	/**
	 * Sets mouse sensitivity
	 */
	setMouseSensitivity(sensitivity: number): void {
		this.mouseSensitivity = sensitivity;
	}
}
