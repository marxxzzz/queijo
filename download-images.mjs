/**
 * download-images.mjs
 * Crawls https://loja-oficial-online.shop/ and downloads ALL images
 * to public/images/ preserving path structure.
 */

import https from "https";
import http from "http";
import fs from "fs";
import path from "path";
import { URL } from "url";

const BASE_URL = "https://loja-oficial-online.shop";
const OUTPUT_DIR = path.join(
  "c:\\Users\\OlecraM\\Downloads\\Nova pasta\\loja-oficial\\public\\images"
);

const visited = new Set();
const downloadedImages = new Set();
const queue = [BASE_URL];
visited.add(BASE_URL);

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,*/*",
};

function fetchText(url) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.get(
      url,
      { headers: HEADERS, timeout: 20000 },
      (res) => {
        // Follow redirects
        if (
          [301, 302, 303, 307, 308].includes(res.statusCode) &&
          res.headers.location
        ) {
          const next = new URL(res.headers.location, url).href;
          res.resume();
          return fetchText(next).then(resolve);
        }
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(data));
      }
    );
    req.on("error", () => resolve(""));
    req.on("timeout", () => { req.destroy(); resolve(""); });
  });
}

function fetchBinary(url) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.get(
      url,
      { headers: HEADERS, timeout: 30000 },
      (res) => {
        if (
          [301, 302, 303, 307, 308].includes(res.statusCode) &&
          res.headers.location
        ) {
          const next = new URL(res.headers.location, url).href;
          res.resume();
          return fetchBinary(next).then(resolve);
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      }
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
  });
}

function extractLinks(html, baseUrl) {
  const links = [];
  // <a href="...">
  const linkRe = /href=["']([^"']+)["']/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    try {
      const full = new URL(m[1], baseUrl).href.split("?")[0].split("#")[0];
      if (full.startsWith(BASE_URL)) links.push(full);
    } catch {}
  }
  return links;
}

function extractImages(html, baseUrl) {
  const imgs = [];
  // src, srcset, data-src, data-lazy-src, data-srcset, content (og:image)
  const patterns = [
    /(?:src|data-src|data-lazy-src|data-orig-file|data-large-file|data-medium-file)=["']([^"']+)["']/gi,
    /content=["']([^"']+)["']/gi,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(html)) !== null) {
      const val = m[1];
      // srcset can have multiple entries separated by comma
      for (const part of val.split(",")) {
        const url = part.trim().split(/\s+/)[0];
        if (!url) continue;
        try {
          const full = new URL(url, baseUrl).href.split("?")[0];
          if (/\.(jpg|jpeg|png|gif|webp|svg|avif|ico)(\?|$)/i.test(full)) {
            imgs.push(full);
          }
        } catch {}
      }
    }
  }
  // srcset separately
  const srcsetRe = /srcset=["']([^"']+)["']/gi;
  let sm;
  while ((sm = srcsetRe.exec(html)) !== null) {
    for (const part of sm[1].split(",")) {
      const url = part.trim().split(/\s+/)[0];
      if (!url) continue;
      try {
        const full = new URL(url, baseUrl).href.split("?")[0];
        if (/\.(jpg|jpeg|png|gif|webp|svg|avif|ico)(\?|$)/i.test(full)) {
          imgs.push(full);
        }
      } catch {}
    }
  }
  return imgs;
}

function urlToLocalPath(imgUrl) {
  const parsed = new URL(imgUrl);
  const p = parsed.pathname.replace(/^\//, "");
  return path.join(OUTPUT_DIR, ...p.split("/"));
}

async function downloadImage(imgUrl) {
  if (downloadedImages.has(imgUrl)) return;
  downloadedImages.add(imgUrl);

  const localPath = urlToLocalPath(imgUrl);
  if (fs.existsSync(localPath)) {
    console.log(`  (exists) ${imgUrl}`);
    return;
  }

  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  const data = await fetchBinary(imgUrl);
  if (!data || data.length === 0) {
    console.log(`  ✗ ${imgUrl}`);
    return;
  }
  fs.writeFileSync(localPath, data);
  console.log(`  ✓ ${path.basename(localPath)} (${(data.length / 1024).toFixed(1)} KB)`);
}

async function crawl() {
  console.log(`Downloading images from ${BASE_URL}`);
  console.log(`Saving to: ${OUTPUT_DIR}\n`);

  while (queue.length > 0 && visited.size <= 300) {
    const pageUrl = queue.shift();
    console.log(`\n[PAGE ${visited.size}] ${pageUrl}`);

    const html = await fetchText(pageUrl);
    if (!html) continue;

    // Download images on this page
    const imgs = extractImages(html, pageUrl);
    for (const img of imgs) {
      await downloadImage(img);
    }

    // Add new pages to crawl
    const links = extractLinks(html, pageUrl);
    for (const link of links) {
      if (!visited.has(link) && visited.size < 300) {
        visited.add(link);
        queue.push(link);
      }
    }

    await new Promise((r) => setTimeout(r, 200)); // polite delay
  }

  console.log(`\n=== DONE ===`);
  console.log(`Pages crawled: ${visited.size}`);
  console.log(`Images downloaded: ${downloadedImages.size}`);
  console.log(`Saved to: ${OUTPUT_DIR}`);
}

crawl().catch(console.error);
