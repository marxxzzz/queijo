import fs from "fs";
const productsPath = "src/data/products.json";
const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));
let updated = 0;
for (const p of products) {
    if (p.galleryImages && p.galleryImages.length > 1) {
        if (!p.imageHover) {
            p.imageHover = p.galleryImages[1];
            updated++;
        }
    }
}
fs.writeFileSync(productsPath, JSON.stringify(products, null, "\t"));
console.log(`Updated imageHover for ${updated} products.`);
