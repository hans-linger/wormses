import type { WormSnapshot } from "../../simulation/snapshots";
import { wormColor } from "../palette";

/**
 * The classic look: one stroke per segment, perpendicular to the spine,
 * extending halfWidth to each side. Dying worms get a small random jitter
 * on every endpoint (cosmetic, so plain Math.random is fine here).
 */
export function drawWorm(
	ctx: CanvasRenderingContext2D,
	worm: WormSnapshot
): void {
	ctx.save();
	ctx.strokeStyle = wormColor(worm.colorSeed);
	ctx.lineWidth = worm.strokeWidth;
	ctx.lineCap = "round";
	ctx.globalAlpha = Math.max(0, Math.min(1, worm.opacity));

	ctx.beginPath();
	for (const seg of worm.segments) {
		const perpX = -Math.sin(seg.heading) * seg.halfWidth;
		const perpY = Math.cos(seg.heading) * seg.halfWidth;
		let x1 = seg.x - perpX;
		let y1 = seg.y - perpY;
		let x2 = seg.x + perpX;
		let y2 = seg.y + perpY;
		if (worm.dying) {
			const j = (): number => (Math.random() - 0.5) * seg.halfWidth * 0.15;
			x1 += j();
			y1 += j();
			x2 += j();
			y2 += j();
		}
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
	}
	ctx.stroke();
	ctx.restore();
}
