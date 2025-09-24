#!/usr/bin/env python3
"""
Prestige AI App Icon Generator
Converts SVG logo to all required app icon formats and sizes
"""

import os
import subprocess
import sys
from pathlib import Path

def check_dependencies():
    """Check if required tools are installed"""
    required_tools = {
        'magick': 'ImageMagick (brew install imagemagick)',
        'iconutil': 'macOS iconutil (built-in on macOS)',
    }
    
    missing = []
    for tool, install_info in required_tools.items():
        try:
            subprocess.run([tool, '--version'], capture_output=True, check=True)
            print(f"✅ {tool} is available")
        except (subprocess.CalledProcessError, FileNotFoundError):
            if tool == 'iconutil' and sys.platform != 'darwin':
                print(f"ℹ️  {tool} not available (not on macOS)")
            else:
                missing.append(f"{tool} - Install: {install_info}")
    
    if missing:
        print("\n❌ Missing required tools:")
        for tool in missing:
            print(f"   {tool}")
        return False
    
    return True

def create_directories():
    """Create necessary directories"""
    dirs = ['icons', 'icons/png', 'build']
    for dir_name in dirs:
        Path(dir_name).mkdir(exist_ok=True)

def generate_png_sizes():
    """Generate PNG files at all required sizes"""
    sizes = [16, 32, 48, 64, 128, 256, 512, 1024]
    svg_file = 'prestige-ai-logo.svg'
    
    if not Path(svg_file).exists():
        print(f"❌ SVG file not found: {svg_file}")
        return False
    
    print("🔄 Generating PNG files...")
    
    for size in sizes:
        output_file = f"icons/png/icon-{size}x{size}.png"
        
        # Use ImageMagick to convert SVG to PNG at specific size
        cmd = [
            'magick',
            '-background', 'none',
            '-size', f'{size}x{size}',
            svg_file,
            output_file
        ]
        
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            print(f"✅ Generated {output_file}")
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to generate {output_file}: {e}")
            return False
    
    return True

def create_icns_file():
    """Create macOS .icns file"""
    if sys.platform != 'darwin':
        print("ℹ️  Skipping .icns creation (not on macOS)")
        return True
    
    # Create iconset directory
    iconset_dir = 'icons/prestige-ai.iconset'
    Path(iconset_dir).mkdir(exist_ok=True)
    
    # Copy PNG files to iconset with proper naming
    icon_mappings = {
        16: ['icon_16x16.png'],
        32: ['icon_16x16@2x.png', 'icon_32x32.png'],
        64: ['icon_32x32@2x.png'],
        128: ['icon_128x128.png'],
        256: ['icon_128x128@2x.png', 'icon_256x256.png'],
        512: ['icon_256x256@2x.png', 'icon_512x512.png'],
        1024: ['icon_512x512@2x.png']
    }
    
    print("🔄 Creating .icns file...")
    
    for size, filenames in icon_mappings.items():
        source = f'icons/png/icon-{size}x{size}.png'
        if Path(source).exists():
            for filename in filenames:
                dest = f'{iconset_dir}/{filename}'
                subprocess.run(['cp', source, dest], check=True)
    
    # Generate .icns file
    try:
        subprocess.run(['iconutil', '-c', 'icns', iconset_dir], check=True)
        print("✅ Generated icons/prestige-ai.icns")
        
        # Clean up iconset directory
        subprocess.run(['rm', '-rf', iconset_dir], check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to create .icns file: {e}")
        return False

def create_ico_file():
    """Create Windows .ico file"""
    ico_sizes = [16, 32, 48, 64, 128, 256]
    png_files = [f'icons/png/icon-{size}x{size}.png' for size in ico_sizes]
    
    # Check if all required PNG files exist
    existing_files = [f for f in png_files if Path(f).exists()]
    
    if not existing_files:
        print("❌ No PNG files found for .ico creation")
        return False
    
    print("🔄 Creating .ico file...")
    
    try:
        cmd = ['magick'] + existing_files + ['icons/prestige-ai.ico']
        subprocess.run(cmd, check=True, capture_output=True)
        print("✅ Generated icons/prestige-ai.ico")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to create .ico file: {e}")
        return False

def create_favicon_files():
    """Create favicon files for web usage"""
    print("🔄 Creating favicon files...")
    
    # Copy standard sizes for favicon
    favicon_mappings = {
        'icons/png/icon-32x32.png': 'favicon-32x32.png',
        'icons/png/icon-16x16.png': 'favicon-16x16.png',
        'icons/png/icon-32x32.png': 'favicon.png'
    }
    
    for source, dest in favicon_mappings.items():
        if Path(source).exists():
            subprocess.run(['cp', source, dest], check=True)
            print(f"✅ Generated {dest}")
    
    # Create favicon.ico from 16x16 and 32x32
    if Path('icons/png/icon-16x16.png').exists() and Path('icons/png/icon-32x32.png').exists():
        try:
            cmd = ['magick', 'icons/png/icon-16x16.png', 'icons/png/icon-32x32.png', 'favicon.ico']
            subprocess.run(cmd, check=True, capture_output=True)
            print("✅ Generated favicon.ico")
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to create favicon.ico: {e}")

def update_electron_config():
    """Update Electron configuration files"""
    print("🔄 Updating Electron configuration...")
    
    # Update package.json build configuration
    package_json_updates = '''
# Add these to your package.json build configuration:

"build": {
  "appId": "com.prestige-ai.app",
  "productName": "Prestige AI",
  "directories": {
    "output": "dist"
  },
  "files": [
    "dist-electron/",
    "dist/",
    "package.json"
  ],
  "mac": {
    "icon": "icons/prestige-ai.icns",
    "category": "public.app-category.developer-tools"
  },
  "win": {
    "icon": "icons/prestige-ai.ico",
    "target": "nsis"
  },
  "linux": {
    "icon": "icons/png/icon-512x512.png",
    "target": "AppImage"
  }
}
'''
    
    with open('electron-build-config.txt', 'w') as f:
        f.write(package_json_updates)
    
    print("✅ Created electron-build-config.txt with build configuration")

def main():
    """Main function to generate all app icons"""
    print("🚀 Prestige AI App Icon Generator")
    print("=" * 40)
    
    if not check_dependencies():
        print("\n❌ Please install required dependencies and try again")
        return
    
    create_directories()
    
    if not generate_png_sizes():
        print("❌ Failed to generate PNG files")
        return
    
    create_icns_file()
    create_ico_file()
    create_favicon_files()
    update_electron_config()
    
    print("\n🎉 App icon generation complete!")
    print("\nGenerated files:")
    print("📁 icons/png/ - PNG files in all sizes")
    print("🍎 icons/prestige-ai.icns - macOS app icon")
    print("🪟 icons/prestige-ai.ico - Windows app icon")
    print("🌐 favicon.ico, favicon-*.png - Web favicons")
    print("⚙️  electron-build-config.txt - Build configuration")
    
    print("\n📋 Next steps:")
    print("1. Copy the build config from electron-build-config.txt to your package.json")
    print("2. Update your Electron main.ts to use the new icon")
    print("3. Test the build process")

if __name__ == "__main__":
    main()