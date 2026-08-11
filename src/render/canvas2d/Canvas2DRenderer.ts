import type { WorldSnapshot } from "../../simulation/snapshots";
import type { Renderer } from "../Renderer";
import { drawEgg } from "./drawEgg";
import { drawFood } from "./drawFood";
import { drawWorm } from "./drawWorm";

export class Canvas2DRenderer implements Renderer {
	private readonly ctx: CanvasRenderingContext2D;

	constructor(private readonly canvas: HTMLCanvasElement) {
		const ctx = canvas.getContext("2d");
		if (ctx === null) {
			throw new Error("Could not acquire 2d canvas context");
		}
		this.ctx = ctx;
	}

	resize(width: number, height: number): void {
		const dpr = window.devicePixelRatio;
		this.canvas.width = Math.round(width * dpr);
		this.canvas.height = Math.round(height * dpr);
		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	render(view: WorldSnapshot): void {
		const { ctx } = this;
		ctx.fillStyle = "#000000";
		ctx.fillRect(0, 0, view.width, view.height);

		for (const food of view.food) drawFood(ctx, food);
		for (const egg of view.eggs) drawEgg(ctx, egg);
		for (const worm of view.worms) drawWorm(ctx, worm);
	}
}
