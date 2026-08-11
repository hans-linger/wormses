import type { FoodSnapshot } from "../../simulation/snapshots";
import { foodColor } from "../palette";

/** Pulsing concentric rings stroked with a black→type-color radial gradient. */
export function drawFood(
	ctx: CanvasRenderingContext2D,
	food: FoodSnapshot
): void {
	ctx.save();
	const gradient = ctx.createRadialGradient(
		food.x,
		food.y,
		0,
		food.x,
		food.y,
		Math.max(1, food.radius)
	);
	gradient.addColorStop(0, "#000000");
	gradient.addColorStop(1, foodColor(food.foodKind));
	ctx.strokeStyle = gradient;
	ctx.lineWidth = 1;

	for (const ring of food.rings) {
		ctx.beginPath();
		ctx.arc(food.x, food.y, Math.max(0.1, food.radius * ring), 0, Math.PI * 2);
		ctx.stroke();
	}
	ctx.restore();
}
