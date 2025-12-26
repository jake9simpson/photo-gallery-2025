import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const srcDir = './src/photos';
const destDir = './src/thumbnails';

// 1. Create thumbnails folder if it doesn't exist
if (!fs.existsSync(destDir)){
    fs.mkdirSync(destDir, { recursive: true });
}

console.log("📷 Generating thumbnails...");

// 2. Read all photos and resize them
fs.readdirSync(srcDir).forEach(file => {
    // Only process images
    if (file.match(/\.(jpg|jpeg|png|webp|JPG)$/i)) {
        const inputFile = path.join(srcDir, file);
        const outputFile = path.join(destDir, file);

        // Resize to 800px width (Perfect for the grid)
        // Quality 80% (Great balance)
        sharp(inputFile)
            .resize({ width: 800 })
            .jpeg({ quality: 80, mozjpeg: true })
            .toFile(outputFile)
            .then(() => process.stdout.write(".")) // Print a dot for progress
            .catch(err => console.error(`\n❌ Error with ${file}:`, err));
    }
});

console.log("\n✅ Done! Thumbnails created in src/thumbnails");