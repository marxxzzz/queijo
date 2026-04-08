import fs from "fs";
import path from "path";

const dir = "C:\\Users\\OlecraM\\Downloads\\Nova pasta\\loja-oficial\\src";

const regex = /https:\/\/loja-oficial-online\.shop\/([^"'\s#?]+\.(?:jpg|jpeg|png|gif|webp|svg|avif|ico))(?:\?[^"'\s#]*)?/gi;

let filesChanged = 0;

function walkDir(currentPath) {
  const files = fs.readdirSync(currentPath);
  for (const file of files) {
    const fullPath = path.join(currentPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else {
      if (
        fullPath.endsWith(".astro") ||
        fullPath.endsWith(".json") ||
        fullPath.endsWith(".ts") ||
        fullPath.endsWith(".js") ||
        fullPath.endsWith(".css")
      ) {
        let content = fs.readFileSync(fullPath, "utf8");
        let modified = false;
        
        const newContent = content.replace(regex, (match, pt1) => {
          modified = true;
          return `/images/${pt1}`;
        });
        
        if (modified) {
          fs.writeFileSync(fullPath, newContent, "utf8");
          console.log(`Updated: ${fullPath}`);
          filesChanged++;
        }
      }
    }
  }
}

walkDir(dir);
console.log(`Done! Modified ${filesChanged} files in src/`);
