import fs from "fs";
import path from "path";

const dirImages = "public/images/wp-content/uploads";
const productsPath = "src/data/products.json";

function getAllLocalImages(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllLocalImages(fullPath, fileList);
        } else {
            if (/\.(jpg|jpeg|png|webp|gif)$/i.test(fullPath)) {
                // Convert backslashes to forward slashes for URLs
                const rel = "/" + fullPath.replace(/\\/g, "/").replace("public/", "");
                fileList.push(rel);
            }
        }
    }
    return fileList;
}

const allImages = getAllLocalImages(dirImages);
console.log(`Found ${allImages.length} local images.`);

const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));
let updatedCount = 0;

for (const p of products) {
    if (!p.galleryImages || p.galleryImages.length <= 1) {
        let baseName = "";
        let dirName = "";
        
        if (p.image) {
            const parts = p.image.split("/");
            const rawFileName = parts.pop();
            dirName = parts.join("/");
            
            // Heuristic: remove the random ID at the end like "-8ygt75n6s5.jpg" or "-247x296.png"
            const nameMatch = rawFileName.match(/^(.+?)(-[0-9a-z-]+)?\.(jpg|png|jpeg|webp)$/i);
            if (nameMatch) {
                // e.g. "cesta_presenta_tabua_de_queijos2" -> we can take "cesta_presenta"
                // Or just take the first Two words by splitting on _ or -
                const chunks = nameMatch[1].split(/_|-/);
                if (chunks.length > 2) {
                    baseName = chunks.slice(0, Math.max(2, chunks.length - 2)).join("[-_]");
                } else {
                    baseName = chunks[0];
                }
            } else {
                 baseName = rawFileName.split('.')[0].slice(0, 8);
            }
        }
        
        // Find matching images in the same directory (or globally)
        let matching = [];
        if (baseName && dirName) {
            const regex = new RegExp(`${dirName}/.*${baseName}.*\\.(jpg|jpeg|png|webp|gif)$`, "i");
            matching = allImages.filter(img => regex.test(img) && !img.includes("-100x100"));
        }
        
        // If not enough matching, pad with some fallback images that look good from the same dir
        if (matching.length < 3) {
            const fallbackRegex = new RegExp(`${dirName}/.*\\.(jpg|jpeg|png|webp|gif)$`, "i");
            const fallbacks = allImages.filter(img => fallbackRegex.test(img) && !img.includes("-100x100"));
            
            for (const f of fallbacks) {
                if (!matching.includes(f) && matching.length < 4) {
                    matching.push(f);
                }
            }
        }
        
        // Ensure at least the main image and hover image are there
        const finalGallery = new Set([p.image]);
        if (p.imageHover) finalGallery.add(p.imageHover);
        
        for (const m of matching.slice(0, 4)) {
            finalGallery.add(m);
        }
        
        p.galleryImages = Array.from(finalGallery).slice(0, 4); // Limit to 4
        updatedCount++;
    }
}

fs.writeFileSync(productsPath, JSON.stringify(products, null, "\t"));
console.log(`Updated ${updatedCount} products with local galleries.`);
