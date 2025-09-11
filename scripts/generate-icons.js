const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function generateIcons() {
  const svgBuffer = await fs.readFile(path.join(__dirname, '../assets/icon/crown-icon.svg'));
  const iconDir = path.join(__dirname, '../assets/icon');
  
  // Ensure directory exists
  await fs.mkdir(iconDir, { recursive: true });
  
  // Generate PNG icons for different sizes
  const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];
  
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(iconDir, `icon-${size}x${size}.png`));
    
    console.log(`Generated ${size}x${size} PNG icon`);
  }
  
  // Generate main icon.png (512x512)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconDir, 'icon.png'));
  
  // Generate icon.ico for Windows (multi-size ICO)
  await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toFile(path.join(iconDir, 'icon.ico'));
  
  console.log('All icons generated successfully!');
  console.log('For macOS .icns file, please use an online converter or macOS tools to convert the PNG files.');
}

generateIcons().catch(console.error);