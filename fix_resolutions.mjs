import fs from "fs";
import path from "path";

const productsPath = "src/data/products.json";
const publicDir = path.resolve("public"); // absolute

const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));
let updatedCount = 0;

function getHighResUrl(url) {
    if (!url || typeof url !== "string") return url;
    // Check if it has a dimension suffix like -247x296
    const match = url.match(/-\d+x\d+(\.[a-z]+)$/i);
    if (match) {
        // Strip the suffix to see if the original high-res image exists
        const highResUrl = url.replace(/-\d+x\d+(?=\.[a-z]+$)/i, "");
        
        // Check if the high res file actually exists locally
        // url is /images/... so we prepend public
        const localPath = path.join(publicDir, highResUrl);
        if (fs.existsSync(localPath)) {
            return highResUrl;
        }
    }
    return url;
}

for (const p of products) {
    let changed = false;
    
    const highResImage = getHighResUrl(p.image);
    if (highResImage !== p.image) {
        p.image = highResImage;
        changed = true;
    }
    
    if (p.imageHover) {
        const highResHover = getHighResUrl(p.imageHover);
        if (highResHover !== p.imageHover) {
            p.imageHover = highResHover;
            changed = true;
        }
    }
    
    if (p.galleryImages && p.galleryImages.length > 0) {
        for (let i = 0; i < p.galleryImages.length; i++) {
            const highResGal = getHighResUrl(p.galleryImages[i]);
            if (highResGal !== p.galleryImages[i]) {
                p.galleryImages[i] = highResGal;
                changed = true;
            }
        }
    }
    
    if (changed) updatedCount++;
}

fs.writeFileSync(productsPath, JSON.stringify(products, null, "\t"));
console.log(`Updated to high-res images for ${updatedCount} products.`);
