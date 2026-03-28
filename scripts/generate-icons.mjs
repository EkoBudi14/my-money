import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const sourceImage = process.argv[2];

if (!sourceImage) {
  console.error('Usage: node scripts/generate-icons.mjs <source-image-path>');
  process.exit(1);
}

const iconsDir = join(rootDir, 'public', 'icons');
mkdirSync(iconsDir, { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

console.log('Generating PWA icons...');

for (const size of sizes) {
  const outputPath = join(iconsDir, `icon-${size}x${size}.png`);
  await sharp(sourceImage)
    .resize(size, size)
    .toFile(outputPath);
  console.log(`✅ Generated icon-${size}x${size}.png`);
}

// Also generate apple-touch-icon (180x180)
await sharp(sourceImage)
  .resize(180, 180)
  .toFile(join(rootDir, 'public', 'apple-touch-icon.png'));
console.log('✅ Generated apple-touch-icon.png');

// Also generate favicon-32x32
await sharp(sourceImage)
  .resize(32, 32)
  .toFile(join(rootDir, 'public', 'favicon-32x32.png'));
console.log('✅ Generated favicon-32x32.png');

console.log('\n🎉 All PWA icons generated successfully!');
