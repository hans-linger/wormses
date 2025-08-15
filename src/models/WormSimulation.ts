import * as THREE from "three";
import { Worm, WormParams } from "./Worm";
import { FPSCamera } from "./FPSCamera";
import { colorFunctions } from "./WormShaders";

/**
 * Main application class that sets up the 3D scene, lighting, ground, worm, and camera
 * Manages the animation loop and handles window resizing
 */
export class WormSimulation {
	private scene!: THREE.Scene;
	private camera!: THREE.PerspectiveCamera;
	private renderer!: THREE.WebGLRenderer;
	private fpsCamera!: FPSCamera;
	private worm!: Worm;
	private followLight!: THREE.PointLight;

	// Animation timing
	private clock: THREE.Clock = new THREE.Clock();
	private lastTime: number = 0;

	constructor() {
		console.log("🚀 WormSimulation constructor starting...");

		try {
			console.log("📝 Step 1: Initialize scene...");
			this.initializeScene();
			console.log("✅ Scene initialized");

			console.log("📝 Step 2: Create lighting...");
			this.createLighting();
			console.log("✅ Lighting created");

			console.log("📝 Step 3: Create ground...");
			this.createGround();
			console.log("✅ Ground created");

			console.log("📝 Step 4: Create worm...");
			this.createWorm();
			console.log("✅ Worm created");

			console.log("📝 Step 5: Setup camera...");
			this.setupCamera();
			console.log("✅ Camera setup");

			console.log("📝 Step 6: Setup renderer...");
			this.setupRenderer();
			console.log("✅ Renderer setup - Canvas should exist now!");

			console.log("📝 Step 7: Setup event listeners...");
			this.setupEventListeners();
			console.log("✅ Event listeners setup");

			console.log("📝 Step 8: Start animation...");
			this.animate();
			console.log("✅ Animation started");

			console.log("🎉 WormSimulation initialization complete!");
		} catch (error) {
			console.error("💥 WormSimulation constructor failed:", error);

			// Try to continue with minimal setup
			console.log("🔧 Attempting minimal fallback setup...");
			this.setupMinimalRenderer();
		}
	}

	/**
	 * Initializes the Three.js scene with fog and background
	 */
	private initializeScene(): void {
		this.scene = new THREE.Scene();

		// Set background color (dark space-like)
		this.scene.background = new THREE.Color(0x0a0a0a);

		// Add atmospheric fog for depth perception
		this.scene.fog = new THREE.Fog(0x0a0a0a, 50, 200);

		console.log("🌌 Scene initialized");
	}

	/**
	 * Creates ambient and directional lighting for the scene
	 */
	private createLighting(): void {
		// Soft ambient light for general illumination
		const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
		this.scene.add(ambientLight);

		// Main directional light (like sunlight)
		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
		directionalLight.position.set(10, 10, 5);
		directionalLight.castShadow = true;

		// Configure shadow settings
		directionalLight.shadow.mapSize.width = 2048;
		directionalLight.shadow.mapSize.height = 2048;
		directionalLight.shadow.camera.near = 0.5;
		directionalLight.shadow.camera.far = 100;
		directionalLight.shadow.camera.left = -50;
		directionalLight.shadow.camera.right = 50;
		directionalLight.shadow.camera.top = 50;
		directionalLight.shadow.camera.bottom = -50;

		this.scene.add(directionalLight);

		// Additional fill light from opposite direction
		const fillLight = new THREE.DirectionalLight(0x4040ff, 0.3);
		fillLight.position.set(-10, 5, -5);
		this.scene.add(fillLight);

		// Point light that follows the worm head
		this.followLight = new THREE.PointLight(0x88ff88, 0.6, 30);
		this.followLight.position.set(0, 5, 0);
		this.scene.add(this.followLight);

		console.log("💡 Lighting setup complete");
	}

	/**
	 * Creates a ground plane with grid pattern for spatial reference
	 */
	private createGround(): void {
		// Create ground geometry
		const groundGeometry = new THREE.PlaneGeometry(200, 200, 50, 50);
		const groundMaterial = new THREE.MeshLambertMaterial({
			color: 0x1a1a1a,
			transparent: true,
			opacity: 0.8,
		});

		const ground = new THREE.Mesh(groundGeometry, groundMaterial);
		ground.rotation.x = -Math.PI / 2; // Rotate to horizontal
		ground.position.y = -5;
		ground.receiveShadow = true;
		this.scene.add(ground);

		// Create grid helper for visual reference
		const gridHelper = new THREE.GridHelper(200, 40, 0x333333, 0x222222);
		gridHelper.position.y = -4.9;
		this.scene.add(gridHelper);

		// Add some reference objects in the distance
		this.createReferenceObjects();

		console.log("🌍 Ground and references created");
	}

	/**
	 * Creates reference objects to help with spatial awareness
	 */
	private createReferenceObjects(): void {
		const objects = [];

		// Create various geometric shapes as landmarks
		for (let i = 0; i < 20; i++) {
			let geometry: THREE.BufferGeometry;
			let material: THREE.Material;

			const type = Math.floor(Math.random() * 3);
			switch (type) {
				case 0:
					geometry = new THREE.BoxGeometry(2, 2, 2);
					material = new THREE.MeshLambertMaterial({
						color: Math.random() * 0xffffff,
					});
					break;
				case 1:
					geometry = new THREE.SphereGeometry(1.5, 8, 6);
					material = new THREE.MeshLambertMaterial({
						color: Math.random() * 0xffffff,
					});
					break;
				case 2:
					geometry = new THREE.ConeGeometry(1.5, 3, 6);
					material = new THREE.MeshLambertMaterial({
						color: Math.random() * 0xffffff,
					});
					break;
				default:
					continue;
			}

			const mesh = new THREE.Mesh(geometry, material);
			mesh.position.set(
				(Math.random() - 0.5) * 150,
				1.5,
				(Math.random() - 0.5) * 150
			);
			mesh.castShadow = true;
			mesh.receiveShadow = true;

			this.scene.add(mesh);
			objects.push(mesh);
		}
	}

	/**
	 * Creates the enhanced worm with natural friction physics
	 */
	private createWorm(): void {
		console.log("🐛 Creating enhanced worm...");

		// IMPORTANT: Dispose old worm if it exists
		if (this.worm) {
			console.log("🗑️ Disposing old worm...");
			this.worm.dispose();
		}

		const wormParams: WormParams = {
			totalLength: 20, // Total worm length
			segmentSpacing: 1.2, // Tighter spacing for more rings
			ringRadius: 0.6, // Smaller, more elegant rings
			ringThickness: 0.06, // Much thinner rings for detail
			pulsationAmplitude: 0.8, // Strong muscle contractions
			pulsationSpeed: 2.5, // Pulsation frequency
			headSpeed: 3.0, // Worm movement speed
			directionChangeInterval: 4000, // Direction change frequency
			turnInertia: 0.02, // Smooth turning
			colorFunction: colorFunctions.rainbow,
			frictionVariation: 0.6, // How much friction varies between rings
			maxFrictionSpeed: 1.0, // Maximum friction speed multiplier
		};

		this.worm = new Worm(this.scene, wormParams);

		// Position worm at origin
		this.worm.setPosition(new THREE.Vector3(0, 2, 0));

		console.log("✅ Enhanced worm created with natural friction physics");

		// Set up color cycling
		this.setupColorCycling();
	}

	/**
	 * Sets up automatic cycling through different color functions
	 */
	private setupColorCycling(): void {
		const colorNames = Object.keys(
			colorFunctions
		) as (keyof typeof colorFunctions)[];
		let currentColorIndex = 0;

		// Change color function every 10 seconds
		setInterval(() => {
			currentColorIndex = (currentColorIndex + 1) % colorNames.length;
			const newColorFunction = colorFunctions[colorNames[currentColorIndex]];
			// Note: Current worm implementation doesn't use color functions in the same way
			console.log(
				`🎨 Color function changed to: ${colorNames[currentColorIndex]}`
			);
		}, 10000);
	}

	/**
	 * Sets up the camera and FPS controller
	 */
	private setupCamera(): void {
		this.camera = new THREE.PerspectiveCamera(
			75, // Field of view
			window.innerWidth / window.innerHeight, // Aspect ratio
			0.1, // Near clipping plane
			1000 // Far clipping plane
		);

		// Position camera above and behind the worm
		this.camera.position.set(0, 8, 10);

		// Create FPS camera controller
		this.fpsCamera = new FPSCamera(this.camera, document.body);
		this.fpsCamera.setMoveSpeed(15);
		this.fpsCamera.setMouseSensitivity(0.003);

		console.log("📷 Camera setup complete");
	}

	/**
	 * Sets up the WebGL renderer with optimal settings
	 */
	private setupRenderer(): void {
		this.renderer = new THREE.WebGLRenderer({
			antialias: true, // Enable anti-aliasing for smooth edges
			alpha: false, // No transparency needed
			powerPreference: "high-performance",
		});

		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit for performance

		// Enable shadows
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		// Improved color and lighting
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.2;

		document.body.appendChild(this.renderer.domElement);

		console.log("🖼️ Renderer setup complete");
	}

	/**
	 * Sets up event listeners for window resize
	 */
	private setupEventListeners(): void {
		window.addEventListener("resize", () => this.onWindowResize(), false);
	}

	/**
	 * Handles window resize events
	 */
	private onWindowResize(): void {
		// Update camera aspect ratio
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();

		// Update renderer size
		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	/**
	 * Main animation loop
	 */
	private animate(): void {
		requestAnimationFrame(() => this.animate());

		const currentTime = Date.now();
		const deltaTime = this.clock.getDelta();

		// Update FPS camera
		this.fpsCamera.update(deltaTime);

		// Update worm animation
		this.worm.update(deltaTime, currentTime);

		// Update follow light to track worm head
		const headPosition = this.worm.getHeadPosition();
		this.followLight.position.copy(headPosition);
		this.followLight.position.y += 3; // Slightly above the worm

		// Render the scene
		this.renderer.render(this.scene, this.camera);

		this.lastTime = currentTime;
	}

	/**
	 * Gets the current worm instance (for debugging or external control)
	 */
	getWorm(): Worm {
		return this.worm;
	}

	/**
	 * Minimal fallback renderer if main setup fails
	 */
	private setupMinimalRenderer(): void {
		try {
			console.log("🔧 Creating minimal renderer...");

			// Create basic scene if needed
			if (!this.scene) {
				this.scene = new THREE.Scene();
				this.scene.background = new THREE.Color(0x0a0a0a);
			}

			// Create basic camera if needed
			if (!this.camera) {
				this.camera = new THREE.PerspectiveCamera(
					75,
					window.innerWidth / window.innerHeight,
					0.1,
					1000
				);
				this.camera.position.set(0, 5, 10);
			}

			// Create minimal renderer
			this.renderer = new THREE.WebGLRenderer({ antialias: true });
			this.renderer.setSize(window.innerWidth, window.innerHeight);
			this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

			// Add renderer to DOM
			document.body.appendChild(this.renderer.domElement);
			console.log("✅ Minimal renderer created and added to DOM");

			// Add a test cube so we see something
			const geometry = new THREE.BoxGeometry(2, 2, 2);
			const material = new THREE.MeshBasicMaterial({
				color: 0x00ff00,
				wireframe: true,
			});
			const cube = new THREE.Mesh(geometry, material);
			this.scene.add(cube);
			console.log("✅ Test cube added");

			// Start minimal animation
			const animate = () => {
				requestAnimationFrame(animate);
				cube.rotation.x += 0.01;
				cube.rotation.y += 0.01;
				this.renderer.render(this.scene, this.camera);
			};
			animate();
			console.log("✅ Minimal animation started");
		} catch (error) {
			console.error("💥 Even minimal renderer failed:", error);
		}
	}
}

// Initialize and start the simulation when the page loads
console.log("🔥 WormSimulation module loaded - setting up initialization...");

document.addEventListener("DOMContentLoaded", () => {
	console.log("🌟 DOM loaded - Starting 3D Worm Simulation...");
	try {
		const simulation = new WormSimulation();

		// Optional: Expose simulation to global scope for debugging
		(window as any).simulation = simulation;

		console.log("🎉 3D Worm Simulation ready!");
		console.log("Click anywhere to enable FPS controls");
		console.log(
			"Use WASD to move, Space/Shift for up/down, mouse to look around"
		);
	} catch (error) {
		console.error("💥 Failed to create WormSimulation:", error);
	}
});

// Also try immediate initialization in case DOM is already loaded
if (document.readyState === "loading") {
	console.log("📝 DOM still loading, waiting for DOMContentLoaded...");
} else {
	console.log("📝 DOM already loaded, initializing immediately...");
	try {
		const simulation = new WormSimulation();
		(window as any).simulation = simulation;
		console.log("🎉 3D Worm Simulation ready (immediate)!");
	} catch (error) {
		console.error("💥 Failed to create WormSimulation (immediate):", error);
	}
}
