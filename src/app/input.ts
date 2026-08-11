import { Vec2 } from "../core/Vec2";

export interface InputHandlers {
	readonly onTogglePause: () => void;
	readonly onPointerMove: (position: Vec2) => void;
}

/** Click toggles pause (as in the original); pointer position feeds hover info. */
export function bindInput(
	canvas: HTMLCanvasElement,
	handlers: InputHandlers
): void {
	canvas.addEventListener("click", () => {
		handlers.onTogglePause();
	});
	canvas.addEventListener("pointermove", (event: PointerEvent) => {
		const rect = canvas.getBoundingClientRect();
		handlers.onPointerMove(
			new Vec2(event.clientX - rect.left, event.clientY - rect.top)
		);
	});
}
