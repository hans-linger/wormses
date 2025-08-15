// Initialize and start the simulation when the page loads
import { WormSimulation } from "./models/WormSimulation";

// Initialize and start the simulation when the page loads
document.addEventListener("DOMContentLoaded", () => {
	const simulation = new WormSimulation();

	// Optional: Expose simulation to global scope for debugging
	(window as any).simulation = simulation;

	console.log("3D Worm Simulation initialized!");
	console.log("Click anywhere to enable FPS controls");
	console.log(
		"Use WASD to move, Space/Shift for up/down, mouse to look around"
	);
});
