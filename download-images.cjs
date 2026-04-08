const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const BASE_URL = "https://loja-oficial-online.shop";
const OUTPUT_DIR = path.join(
  "c:\\Users\\OlecraM\\Downloads\\Nova pasta\\loja-oficial\\public\\images"
);

const visited = new Set();
const downloadedImages = new Set();
const queue = [BASE_URL];
visited.add(BASE_URL);

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36";

function fetchText(url, depth) {
  if (depth > 3) return Promise.resolve("");
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: { "User-Agent": UA, "Accept": "text/html,*/*" },
      timeout: 15000,
    };
    const req = lib.get(options, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        try {
          const next = new URL(res.headers.location, url).href;
          fetchText(next, (depth || 0) + 1).then(resolve);
        } catch { resolve(""); }
        return;
      }
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (c) => { data += c; });
      res.on("end", () => { resolve(data); });
    });
    req.on("error", (e) => { console.log("  fetch error:", e.message); resolve(""); });
  });
}

function fetchBinary(url) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: { "User-Agent": UA },
      timeout: 20000,
    };
    const req = lib.get(options, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        try { fetchBinary(new URL(res.headers.location, url).href).then(resolve); }
        catch { resolve(null); }
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });
    req.on("error", () => resolve(null));
  });
}

function extractLinks(html, baseUrl) {
  const links = [];
  const re = /href=["']([^"'#?]+)/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const full = new URL(m[1], baseUrl).href;
      if (full.startsWith(BASE_URL)) links.push(full);
    } catch {}
  }
  return links;
}

function extractImages(html, baseUrl) {
  const imgs = new Set();
  const patterns = [
    /(?:src|data-src|data-lazy-src|data-orig-file|data-large-file|data-medium-file|data-full-url)=["']([^"']+)["']/gi,
    /srcset=["']([^"']+)["']/gi,
    /content=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp|svg|avif))["']/gi,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(html)) !== null) {
      for (const part of m[1].split(",")) {
        const url = part.trim().split(/\s+/)[0];
        if (!url) continue;
        try {
          const full = new URL(url, baseUrl).href.split("?")[0];
          if (/\.(jpg|jpeg|png|gif|webp|svg|avif|ico)$/i.test(full)) {
            imgs.add(full);
          }
        } catch {}
      }
    }
  }
  return Array.from(imgs);
}

function urlToLocalPath(imgUrl) {
  const parsed = new URL(imgUrl);
  let p = parsed.pathname.replace(/^\//, "");
  p = p.replace(/[<>:"|?*]/g, "_");
  return path.join(OUTPUT_DIR, ...p.split("/"));
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function downloadImage(imgUrl) {
  if (downloadedImages.has(imgUrl)) return;
  downloadedImages.add(imgUrl);

  const localPath = urlToLocalPath(imgUrl);
  if (fs.existsSync(localPath)) {
    return; // already exists
  }

  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  const data = await fetchBinary(imgUrl);
  if (!data || data.length === 0) {
    console.log("  ✗ FAIL", path.basename(localPath));
    return;
  }
  fs.writeFileSync(localPath, data);
  console.log(`  ✓ ${path.basename(localPath)} (${(data.length / 1024).toFixed(1)} KB)`);
}

async function crawl() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log("Starting crawl:", BASE_URL);
  console.log("Saving to:", OUTPUT_DIR, "\n");

  let pageCount = 0;
  while (queue.length > 0) {
    const pageUrl = queue.shift();
    pageCount++;
    console.log(`\n[PAGE ${pageCount}/${visited.size}] ${pageUrl}`);

    const html = await fetchText(pageUrl, 0);
    if (!html) { console.log("  (empty)"); continue; }
    console.log(`  HTML: ${html.length} chars`);

    const imgs = extractImages(html, pageUrl);
    console.log(`  Images found: ${imgs.length}`);
    for (const img of imgs) {
      await downloadImage(img);
    }

    const links = extractLinks(html, pageUrl);
    for (const link of links) {
      if (!visited.has(link) && visited.size < 250) {
        visited.add(link);
        queue.push(link);
      }
    }

    await delay(250);
  }

  console.log("\n=== COMPLETE ===");
  console.log("Pages crawled:", pageCount);
  console.log("Images saved:", downloadedImages.size);
}

crawl().catch((e) => { console.error(e); process.exit(1); });
