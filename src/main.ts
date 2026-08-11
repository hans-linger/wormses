import { DebugPanel } from "./app/DebugPanel";
import { bindInput } from "./app/input";
import { Loop } from "./app/Loop";
import { Vec2 } from "./core/Vec2";
import { defaultConfig } from "./config/defaults";
import type { WormSnapshot } from "./contracts/snapshots";
import { World } from "./models/World";
import { Canvas2DRenderer } from "./render/canvas2d/Canvas2DRenderer";

const canvas = document.getElementById("world");
if (!(canvas instanceof HTMLCanvasElement)) {
	throw new Error("Canvas #world not found");
}

const width = Math.max(100, window.innerWidth);
const height = Math.max(100, window.innerHeight);

let world = new World(defaultConfig({ width, height, seed: Date.now() >>> 0 }));
const renderer = new Canvas2DRenderer(canvas);
renderer.resize(width, height);
window.addEventListener("resize", () => {
	// World bounds stay as created; only the canvas backing store adapts.
	renderer.resize(window.innerWidth, window.innerHeight);
});

let pointer = new Vec2(-1, -1);

function hoveredWorm(): WormSnapshot | null {
	for (const worm of world.snapshot().worms) {
		for (const seg of worm.segments) {
			const d = Math.hypot(seg.x - pointer.x, seg.y - pointer.y);
			if (d < Math.max(12, seg.halfWidth)) return worm;
		}
	}
	return null;
}

const loop = new Loop(
	(dt) => {
		world.update(dt);
	},
	() => {
		renderer.render(world.snapshot());
	}
);

bindInput(canvas, {
	onTogglePause: () => {
		loop.togglePause();
	},
	onPointerMove: (position) => {
		pointer = position;
	},
});

new DebugPanel(() => {
	const worm = hoveredWorm();
	return {
		fps: loop.fps,
		paused: loop.paused,
		worms: world.wormCount,
		eggs: world.eggCount,
		food: world.foodCount,
		eaten: world.stats.eaten,
		hovered:
			worm === null
				? null
				: `${worm.id}: L${String(worm.length)} ` +
					`W${worm.baseWidth.toFixed(1)} v${worm.maxSpeed.toFixed(0)}\n` +
					`→ ${worm.targetId ?? "wandering"}`,
	};
});

loop.start();

// Typed debug handle for the console and automated smoke checks.
interface WormsesDebug {
	readonly loop: Loop;
	readonly renderer: Canvas2DRenderer;
	world: () => World;
	rebuild: (w: number, h: number, seed?: number) => void;
	step: (frames: number) => void;
}
declare global {
	interface Window {
		wormses?: WormsesDebug;
	}
}
window.wormses = {
	loop,
	renderer,
	world: () => world,
	rebuild: (w, h, seed) => {
		world = new World(
			defaultConfig({ width: w, height: h, seed: seed ?? Date.now() >>> 0 })
		);
		renderer.resize(w, h);
	},
	step: (frames) => {
		for (let i = 0; i < frames; i++) world.update(1 / 60);
		renderer.render(world.snapshot());
	},
};
