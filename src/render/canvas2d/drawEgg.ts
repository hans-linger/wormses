import type { EggSnapshot } from "../../simulation/snapshots";

/** Concentric wobbly polygons through the egg's random unit-circle dots. */
export function drawEgg(ctx: CanvasRenderingContext2D, egg: EggSnapshot): void {
	ctx.save();
	ctx.strokeStyle = "#ffffff";
	ctx.lineWidth = 1;
	ctx.lineCap = "round";

	for (const ring of egg.rings) {
		const scale = egg.radius * ring;
		ctx.beginPath();
		for (let i = 0; i < egg.dots.length; i++) {
			const dot = egg.dots[i];
			if (dot === undefined) continue;
			const px = egg.x + dot[0] * scale;
			const py = egg.y + dot[1] * scale;
			if (i === 0) ctx.moveTo(px, py);
			else ctx.lineTo(px, py);
		}
		ctx.closePath();
		ctx.stroke();
	}
	ctx.restore();
}
