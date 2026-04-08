import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.resolve(__dirname, "../../index.html");
const outPath = path.resolve(__dirname, "../src/data/products.json");

function brPriceToNumber(s) {
	return Number.parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
}

const html = fs.readFileSync(htmlPath, "utf8");
const blocks = html.split('<div class="product-small box');
const products = [];
const seen = new Set();

for (const block of blocks.slice(1)) {
	const hrefM = block.match(
		/href="https:\/\/loja-oficial-online\.shop\/produto\/([^"]+)\//,
	);
	if (!hrefM) continue;
	const slug = hrefM[1];
	if (seen.has(slug)) continue;

	const linkM = block.match(
		/<a href="https:\/\/loja-oficial-online\.shop\/produto\/[^"]+\/"[^>]*>([\s\S]*?)<\/a>/,
	);
	let image = "";
	let imageHover;
	if (linkM) {
		const inner = linkM[1];
		const imgTags = [...inner.matchAll(/<img[^>]+>/g)].map((m) => m[0]);
		for (const tag of imgTags) {
			const sm = tag.match(/src="([^"]+)"/);
			if (!sm) continue;
			const src = sm[1];
			if (tag.includes("show-on-hover")) imageHover = src;
			else if (tag.includes("woocommerce_thumbnail")) image = src;
		}
		if (!image && imgTags.length) {
			const sm = imgTags[0].match(/src="([^"]+)"/);
			if (sm) image = sm[1];
		}
		if (imageHover === image) imageHover = undefined;
	}
	if (!image) {
		const imgs = [...block.matchAll(/<img[^>]+>/g)];
		for (const im of imgs) {
			const tag = im[0];
			if (
				tag.includes("woocommerce_thumbnail") ||
				tag.includes("size-woocommerce_thumbnail")
			) {
				const sm = tag.match(/src="([^"]+)"/);
				if (sm) {
					image = sm[1];
					break;
				}
			}
		}
	}
	if (!image) continue;

	const titleM = block.match(
		/class="woocommerce-LoopProduct-link[^"]*"[^>]*>([^<]+)<\/a>/,
	);
	if (!titleM) continue;
	const title = titleM[1]
		.replace(/&#8211;/g, "–")
		.replace(/&amp;/g, "&")
		.trim();

	const prices = [...block.matchAll(/&nbsp;([\d.,]+)<\/bdi>/g)];
	if (prices.length < 3) continue;
	const was = prices[0][1];
	const now = prices[1][1];
	const instVal = prices[2][1];

	const instM = block.match(/<span class="number">(\d+)<\/span>x de/);
	const instN = instM ? instM[1] : "10";

	const unitPrice = brPriceToNumber(now);

	seen.add(slug);
	const row = {
		slug,
		title,
		image,
		wasRaw: was,
		nowRaw: now,
		instN,
		instValRaw: instVal,
		compareAt: `R$ ${was}`,
		price: `R$ ${now}`,
		unitPrice,
		installment: `${instN}x de R$ ${instVal}`,
	};
	if (imageHover) row.imageHover = imageHover;
	products.push(row);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(products, null, "\t"));
console.log("Wrote", products.length, "products to", outPath);
console.log(
	"Próximo passo: npm run enrich-products (descrições/galeria) e npm run scrape-legal — ou npm run sync-data",
);
