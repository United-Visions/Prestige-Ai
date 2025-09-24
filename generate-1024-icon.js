const fs = require('fs');
const path = require('path');

/**
 * Generate Missing 1024x1024 Icon for macOS Dock
 * Creates the specific high-resolution size that macOS needs for proper dock display
 */

let sharp;
try {
  sharp = require('sharp');
  console.log('✅ Sharp found - generating 1024x1024 icon');
} catch (e) {
  console.error('❌ Sharp not found. Please install: npm install sharp');
  process.exit(1);
}

async function generate1024Icon() {
  const svgPath = 'prestige-ai-logo.svg';
  
  if (!fs.existsSync(svgPath)) {
    console.error(`❌ SVG file not found: ${svgPath}`);
    process.exit(1);
  }

  try {
    console.log('🎨 Generating 1024x1024 icon from SVG...');
    
    const svgBuffer = fs.readFileSync(svgPath);
    
    // Create the 1024x1024 PNG for macOS dock
    const output1024Path = 'assets/icon/mac/icon_512x512@2x.png';
    await sharp(svgBuffer)
      .resize(1024, 1024, { 
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: 100, compressionLevel: 0 })
      .toFile(output1024Path);
    
    console.log(`✅ Created 1024x1024 icon: ${output1024Path}`);
    
    // Also create a direct 1024x1024 file for reference
    const direct1024Path = 'assets/icon/mac/icon_1024x1024.png';
    await sharp(svgBuffer)
      .resize(1024, 1024, { 
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: 100, compressionLevel: 0 })
      .toFile(direct1024Path);
    
    console.log(`✅ Created direct 1024x1024 icon: ${direct1024Path}`);
    
    // Now recreate the .icns with the proper 1024x1024 size
    console.log('📦 Recreating .icns with 1024x1024 size...');
    
    const iconsetDir = 'temp-1024.iconset';
    if (fs.existsSync(iconsetDir)) {
      fs.rmSync(iconsetDir, { recursive: true });
    }
    fs.mkdirSync(iconsetDir);
    
    // Copy all existing icons
    const macIconsDir = 'assets/icon/mac/';
    const iconFiles = fs.readdirSync(macIconsDir)
      .filter(file => file.endsWith('.png'))
      .filter(file => !file.includes('1024x1024')); // Exclude our new direct file
    
    for (const file of iconFiles) {
      fs.copyFileSync(path.join(macIconsDir, file), path.join(iconsetDir, file));
    }
    
    // Create the .icns
    const { execSync } = require('child_process');
    try {
      execSync(`iconutil -c icns "${iconsetDir}" -o "assets/icon/icon.icns"`);
      console.log('✅ Updated icon.icns with 1024x1024 support');
    } catch (error) {
      console.log('⚠️  Could not create .icns:', error.message);
    }
    
    // Clean up
    fs.rmSync(iconsetDir, { recursive: true });
    
    console.log('\n🎉 1024x1024 icon generation complete!');
    console.log('📁 Files updated:');
    console.log(`   • ${output1024Path} (1024x1024 for .icns)`);
    console.log(`   • ${direct1024Path} (direct 1024x1024)`);
    console.log('   • assets/icon/icon.icns (updated with 1024x1024)');
    
    // Check file size
    const stats = fs.statSync(output1024Path);
    console.log(`📊 1024x1024 file size: ${(stats.size / 1024).toFixed(1)}KB`);
    
  } catch (error) {
    console.error('❌ Error generating 1024x1024 icon:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generate1024Icon();
}

module.exports = { generate1024Icon };