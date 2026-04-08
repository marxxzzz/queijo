"""
Download all images from https://loja-oficial-online.shop/ and all linked pages.
Saves images to: loja-oficial/public/images/ preserving directory structure.
"""

import os
import re
import time
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from collections import deque

BASE_URL = "https://loja-oficial-online.shop"
OUTPUT_DIR = r"c:\Users\OlecraM\Downloads\Nova pasta\loja-oficial\public\images"

os.makedirs(OUTPUT_DIR, exist_ok=True)

visited_pages = set()
image_urls = set()

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


class LinkImageParser(HTMLParser):
    def __init__(self, base_url):
        super().__init__()
        self.base_url = base_url
        self.links = []
        self.images = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "a":
            href = attrs.get("href", "")
            if href:
                full = urllib.parse.urljoin(self.base_url, href)
                if full.startswith(BASE_URL) and "#" not in full:
                    self.links.append(full.rstrip("/"))
        if tag in ("img", "source"):
            for attr in ("src", "srcset", "data-src", "data-lazy-src", "data-srcset"):
                val = attrs.get(attr, "")
                if val:
                    for part in val.split(","):
                        url = part.strip().split(" ")[0]
                        if url:
                            full = urllib.parse.urljoin(self.base_url, url)
                            if full.startswith("http"):
                                self.images.append(full)


def fetch(url):
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"  ERROR fetching {url}: {e}")
        return ""


def url_to_local_path(img_url):
    parsed = urllib.parse.urlparse(img_url)
    # Remove query strings, keep path
    path = parsed.path.lstrip("/")
    # Sanitize
    path = re.sub(r'[<>:"|?*]', "_", path)
    return os.path.join(OUTPUT_DIR, path.replace("/", os.sep))


def download_image(img_url):
    local_path = url_to_local_path(img_url)
    if os.path.exists(local_path):
        return  # already downloaded
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    try:
        req = urllib.request.Request(img_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
        with open(local_path, "wb") as f:
            f.write(data)
        print(f"  ✓ {img_url}")
    except Exception as e:
        print(f"  ✗ {img_url}: {e}")


def crawl():
    queue = deque([BASE_URL])
    visited_pages.add(BASE_URL)

    while queue:
        page_url = queue.popleft()
        print(f"\n[PAGE] {page_url}")
        html = fetch(page_url)
        if not html:
            continue

        parser = LinkImageParser(page_url)
        parser.feed(html)

        # Collect images
        for img in parser.images:
            if img not in image_urls:
                image_urls.add(img)
                download_image(img)

        # Queue new pages (only same domain, avoid huge crawls)
        for link in parser.links:
            clean = link.split("?")[0]
            if clean not in visited_pages and len(visited_pages) < 200:
                visited_pages.add(clean)
                queue.append(clean)

        time.sleep(0.3)  # be polite

    print(f"\n=== Done! Pages crawled: {len(visited_pages)}, Images downloaded: {len(image_urls)} ===")


if __name__ == "__main__":
    crawl()
