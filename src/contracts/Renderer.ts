import type { WorldSnapshot } from "./snapshots";

/**
 * The rendering seam. A renderer consumes read-only world snapshots and may
 * never reach into simulation objects. A future 3D renderer implements this
 * same interface by lofting each worm's spine + radius profile into a tube.
 */
export interface Renderer {
	render(view: WorldSnapshot): void;
	resize(width: number, height: number): void;
}
