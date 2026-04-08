import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";

const OUTPUT_DIR = path.resolve("public/images");
const jsonPath = path.resolve("src/data/products.json");

function urlToLocalPath(imgUrl) {
	try {
        if (!imgUrl.startsWith("http")) return null;
		const parsed = new URL(imgUrl);
		let p = parsed.pathname.replace(/^\//, "");
		p = p.replace(/[<>:"|?*]/g, "_");
		return path.join(OUTPUT_DIR, ...p.split("/"));
	} catch(e) {
		return null;
	}
}

async function fetchWithTimeout(url, timeoutMs = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: controller.signal
    });
    clearTimeout(id);
    return response;
}

async function downloadImage(url) {
	const dest = urlToLocalPath(url);
	if (!dest) return null;
	if (fs.existsSync(dest)) {
		return dest;
	}
	
	try {
		const res = await fetchWithTimeout(url, 15000);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const arrayBuffer = await res.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		fs.mkdirSync(path.dirname(dest), { recursive: true });
		fs.writeFileSync(dest, buffer);
		return dest;
	} catch (e) {
		console.error(`Error downloading ${url}:`, e.message);
		return null;
	}
}

async function scrapeGallery(slug) {
	const url = `https://loja-oficial-online.shop/produto/${slug}/`;
	try {
		const res = await fetchWithTimeout(url, 10000);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const html = await res.text();
		const $ = cheerio.load(html);
		const gallery = [];
		$(".woocommerce-product-gallery__wrapper .woocommerce-product-gallery__image img").each((_, el) => {
			let src = $(el).attr("data-large_image") || $(el).attr("data-src") || $(el).attr("src");
			if (src && !gallery.includes(src) && src.startsWith("http")) {
			    // clean up query strings like ?v=...
			    src = src.split("?")[0];
				gallery.push(src);
			}
		});
		return gallery;
	} catch(e) {
		console.error(`[${slug}] Error fetching page:`, e.message);
		return [];
	}
}

function resolveAssetPath(url) {
    const parsed = new URL(url);
    let p = parsed.pathname;
    return "/images" + p;
}

async function processProduct(p, i, total) {
    if (!p.galleryImages || p.galleryImages.length <= 1) {
        console.log(`[${i+1}/${total}] Scraping ${p.slug}...`);
        const remoteGallery = await scrapeGallery(p.slug);
        
        if (remoteGallery && remoteGallery.length > 0) {
            const localGallery = [];
            // Download images in parallel
            await Promise.all(remoteGallery.map(async (url) => {
                const downloaded = await downloadImage(url);
                if (downloaded) {
                    localGallery.push(resolveAssetPath(url));
                }
            }));
            
            if (localGallery.length > 0) {
                p.galleryImages = localGallery;
                return true;
            }
        }
    }
    return false;
}

async function run() {
	const products = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
	let updatedCount = 0;
    
    // Batch processing
    const BATCH_SIZE = 5;
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map((p, idx) => processProduct(p, i + idx, products.length)));
        
        for (const updated of results) {
            if (updated) updatedCount++;
        }
    }
	
	if (updatedCount > 0) {
		fs.writeFileSync(jsonPath, JSON.stringify(products, null, "\t"));
		console.log(`Successfully updated ${updatedCount} products with missing galleries.`);
	} else {
		console.log("No new galleries added.");
	}
}

run().catch(console.error);
