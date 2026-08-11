const canvas = document.getElementById("world");
if (!(canvas instanceof HTMLCanvasElement)) {
	throw new Error("Canvas #world not found");
}
