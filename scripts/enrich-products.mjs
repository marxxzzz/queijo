import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import { normalizeDescriptionHtml } from "./description-html-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.resolve(__dirname, "../src/data/products.json");
const base = "https://loja-oficial-online.shop";

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}

async function fetchHtml(slug) {
	const url = `${base}/produto/${slug}/`;
	const res = await fetch(url, {
		headers: { "user-agent": "loja-oficial-static-enrich/1.0" },
	});
	if (!res.ok) throw new Error(`${url} ${res.status}`);
	return res.text();
}

function parseProductPage(html) {
	const $ = cheerio.load(html);
	let desc = $(".product-page-sections .panel.entry-content").first().html()?.trim();
	if (!desc)
		desc = $("#tab-description, .woocommerce-Tabs-panel--description")
			.first()
			.html()
			?.trim();
	if (!desc) desc = $(".product-short-description").first().html()?.trim();
	if (!desc)
		desc = $(".woocommerce-product-details__short-description").first().html()?.trim();
	const descriptionHtml = desc ? normalizeDescriptionHtml(desc) : null;

	const crumbs = $(".product-breadcrumb-container a")
		.toArray()
		.map((a) => ({
			href: $(a).attr("href") || "",
			text: $(a).text().trim(),
		}));
	const category =
		crumbs.length >= 2
			? { name: crumbs[1].text, href: crumbs[1].href }
			: null;

	const gallery = [];
	$(".woocommerce-product-gallery__wrapper .woocommerce-product-gallery__image img").each(
		(_, el) => {
			const src =
				$(el).attr("data-large_image") ||
				$(el).attr("data-src") ||
				$(el).attr("src");
			if (src && !gallery.includes(src)) gallery.push(src);
		},
	);

	return { descriptionHtml, category, gallery };
}

async function main() {
	const raw = fs.readFileSync(jsonPath, "utf8");
	const products = JSON.parse(raw);
	let ok = 0;
	let fail = 0;

	for (let i = 0; i < products.length; i++) {
		const p = products[i];
		process.stdout.write(`\r[${i + 1}/${products.length}] ${p.slug.slice(0, 40)}…`);
		try {
			const html = await fetchHtml(p.slug);
			const { descriptionHtml, category, gallery } = parseProductPage(html);
			if (descriptionHtml) p.descriptionHtml = descriptionHtml;
			if (category) {
				p.categoryName = category.name;
				p.categoryHref = category.href.replace(base, "") || "/";
			}
			if (gallery.length) p.galleryImages = gallery;
			ok++;
		} catch (e) {
			console.error(`\nfail ${p.slug}:`, e.message);
			fail++;
		}
		await sleep(250);
	}

	fs.writeFileSync(jsonPath, JSON.stringify(products, null, "\t"));
	console.log(`\nDone. OK ${ok}, fail ${fail}. Wrote ${jsonPath}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
