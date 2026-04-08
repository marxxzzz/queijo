import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeDescriptionHtml } from "./description-html-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.resolve(__dirname, "../src/data/products.json");

const products = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
let n = 0;
for (const p of products) {
	if (p.descriptionHtml) {
		const next = normalizeDescriptionHtml(p.descriptionHtml);
		if (next !== p.descriptionHtml) n++;
		p.descriptionHtml = next;
	}
}
fs.writeFileSync(jsonPath, JSON.stringify(products, null, "\t"));
console.log("Atualizado products.json —", n, "descrições normalizadas (font-family removido).");
