/**
 * Fixed-timestep game loop: the simulation always advances in exact 1/60 s
 * steps regardless of display refresh rate, so behavior is frame-rate
 * independent (the original was per-frame and thus speed-tied to fps).
 */
export class Loop {
	paused = false;

	private static readonly STEP = 1 / 60;
	private static readonly MAX_FRAME = 0.25;

	private accumulator = 0;
	private last: number | null = null;
	private fpsEma = 60;

	constructor(
		private readonly update: (dt: number) => void,
		private readonly render: () => void
	) {}

	get fps(): number {
		return this.fpsEma;
	}

	start(): void {
		requestAnimationFrame(this.tick);
	}

	togglePause(): void {
		this.paused = !this.paused;
	}

	private readonly tick = (now: number): void => {
		const nowSec = now / 1000;
		if (this.last !== null) {
			const frame = Math.min(Loop.MAX_FRAME, nowSec - this.last);
			if (frame > 0) {
				this.fpsEma = this.fpsEma * 0.95 + (1 / frame) * 0.05;
			}
			if (!this.paused) {
				this.accumulator += frame;
				while (this.accumulator >= Loop.STEP) {
					this.update(Loop.STEP);
					this.accumulator -= Loop.STEP;
				}
			}
		}
		this.last = nowSec;
		this.render();
		requestAnimationFrame(this.tick);
	};
}
