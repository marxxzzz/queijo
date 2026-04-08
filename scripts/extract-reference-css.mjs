import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = fileURLToPath(new URL("../../index.html", import.meta.url));
const outDir = path.resolve(__dirname, "../src/styles/reference");
const h = fs.readFileSync(htmlPath, "utf8");
const parts = [];

function grab(id) {
	const re = new RegExp(
		`<style[^>]*id=['"]${id}['"][^>]*>([\\s\\S]*?)</style>`,
		"i",
	);
	const m = h.match(re);
	if (m) parts.push(`/* ${id} */\n${m[1]}`);
}

for (const id of [
	"custom-css",
	"wp-custom-css",
	"flatsome-main-inline-css",
	"wc-installments-simulator-inline-css",
	"flatsome-swatches-css",
	"flatsome-variation-images-css",
]) {
	grab(id);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "extracted.css"), parts.join("\n\n"));
console.log("Wrote", path.join(outDir, "extracted.css"), parts.length, "blocks");
