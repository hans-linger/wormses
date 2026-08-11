import { harmonicGains } from "../simulation/harmonics";

export interface DebugStats {
	readonly fps: number;
	readonly paused: boolean;
	readonly worms: number;
	readonly eggs: number;
	readonly food: number;
	readonly hovered: string | null;
}

/**
 * Minimal overlay: live stats plus sliders that scale each shape harmonic
 * in real time (writes to harmonicGains). Toggle with the H key.
 */
export class DebugPanel {
	private readonly root: HTMLDivElement;
	private readonly statsEl: HTMLPreElement;

	constructor(private readonly getStats: () => DebugStats) {
		this.root = document.createElement("div");
		this.root.style.cssText =
			"position:fixed;top:8px;left:8px;padding:8px 10px;" +
			"background:rgba(0,0,0,0.7);color:#9f9;border:1px solid #363;" +
			"font:11px/1.5 monospace;z-index:10;user-select:none;min-width:200px";

		this.statsEl = document.createElement("pre");
		this.statsEl.style.cssText = "margin:0 0 6px 0;font:inherit";
		this.root.appendChild(this.statsEl);

		this.addSlider("envelope", "envelope");
		this.addSlider("head", "headThickening");
		this.addSlider("wobble", "wobble");

		document.body.appendChild(this.root);
		document.addEventListener("keydown", (e: KeyboardEvent) => {
			if (e.key === "h" || e.key === "H") {
				this.root.style.display =
					this.root.style.display === "none" ? "block" : "none";
			}
		});

		setInterval(() => {
			this.refresh();
		}, 250);
	}

	private addSlider(label: string, key: keyof typeof harmonicGains): void {
		const row = document.createElement("label");
		row.style.cssText = "display:flex;gap:6px;align-items:center";
		const caption = document.createElement("span");
		caption.textContent = label.padEnd(8);
		caption.style.cssText = "width:64px";
		const slider = document.createElement("input");
		slider.type = "range";
		slider.min = "0";
		slider.max = "3";
		slider.step = "0.05";
		slider.value = String(harmonicGains[key]);
		slider.style.cssText = "flex:1";
		slider.addEventListener("input", () => {
			harmonicGains[key] = Number(slider.value);
		});
		row.appendChild(caption);
		row.appendChild(slider);
		this.root.appendChild(row);
	}

	private refresh(): void {
		const s = this.getStats();
		this.statsEl.textContent =
			`fps ${s.fps.toFixed(0).padStart(3)}  ${s.paused ? "PAUSED" : "live"}\n` +
			`worms ${String(s.worms)}  eggs ${String(s.eggs)}  food ${String(s.food)}` +
			(s.hovered === null ? "" : `\n${s.hovered}`);
	}
}
