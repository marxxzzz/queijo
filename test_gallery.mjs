import fs from "fs";
const data = JSON.parse(fs.readFileSync("src/data/products.json", "utf8"));
let hasGallery = 0;
let missingGallery = 0;
for (const p of data) {
    if (p.galleryImages && p.galleryImages.length > 1) hasGallery++;
    else missingGallery++;
}
console.log(`Products with gallery: ${hasGallery}, Products with missing/single gallery: ${missingGallery}`);
