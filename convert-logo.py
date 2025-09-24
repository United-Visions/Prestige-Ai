#!/usr/bin/env python3
"""
Prestige AI Logo to PNG Converter
This script converts the React TSX logo component to a PNG image.
"""

import json
import base64
from pathlib import Path

def create_svg_logo():
    """Create an SVG version of the Prestige AI logo that can be easily converted to PNG"""
    
    svg_content = '''<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gold gradient for crown -->
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#FFA500;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#DAA520;stop-opacity:1" />
    </linearGradient>
    
    <!-- Background gradient -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#581c87;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
    </linearGradient>
    
    <!-- Noise filter -->
    <filter id="noiseFilter">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"/>
    </filter>
  </defs>
  
  <!-- Main container background -->
  <rect x="64" y="64" width="128" height="128" rx="24" ry="24" 
        fill="url(#bgGradient)" 
        stroke="#7c3aed" stroke-width="1" stroke-opacity="0.3"/>
  
  <!-- Noise overlay -->
  <rect x="64" y="64" width="128" height="128" rx="24" ry="24" 
        fill="white" opacity="0.2" filter="url(#noiseFilter)"/>
  
  <!-- Crown -->
  <g transform="translate(128, 84)">
    <!-- Crown base shape -->
    <path d="M-16,-8 L-12,-16 L-8,-12 L-4,-16 L0,-12 L4,-16 L8,-12 L12,-16 L16,-8 L12,-4 L-12,-4 Z" 
          fill="url(#goldGradient)" 
          stroke="#b45309" stroke-width="1"/>
    <!-- Crown gems -->
    <circle cx="-8" cy="-10" r="2" fill="#fbbf24"/>
    <circle cx="0" cy="-12" r="2" fill="#fbbf24"/>
    <circle cx="8" cy="-10" r="2" fill="#fbbf24"/>
  </g>
  
  <!-- Main P letter -->
  <text x="128" y="148" 
        font-family="system-ui, -apple-system, sans-serif" 
        font-size="56" 
        font-weight="900" 
        text-anchor="middle" 
        fill="white">P</text>
  
  <!-- XML tag -->
  <text x="72" y="80" 
        font-family="monospace" 
        font-size="12" 
        font-weight="bold" 
        fill="#4ade80">&lt;/&gt;</text>
  
  <!-- Animated dots -->
  <g transform="translate(172, 176)">
    <circle cx="0" cy="0" r="3" fill="#4ade80">
      <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="8" cy="0" r="3" fill="#22d3ee">
      <animate attributeName="opacity" values="1;0.5;1" dur="2s" begin="0.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="16" cy="0" r="3" fill="#a855f7">
      <animate attributeName="opacity" values="1;0.5;1" dur="2s" begin="0.4s" repeatCount="indefinite"/>
    </circle>
  </g>
</svg>'''
    
    return svg_content

def save_logo_files():
    """Save both SVG and provide instructions for PNG conversion"""
    
    # Create SVG version
    svg_content = create_svg_logo()
    
    # Save SVG file
    svg_path = Path('prestige-ai-logo.svg')
    with open(svg_path, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    
    print("✅ SVG logo created successfully!")
    print(f"📁 Saved as: {svg_path.absolute()}")
    
    # Create conversion instructions
    instructions = """
# Prestige AI Logo Conversion Instructions

## SVG to PNG Conversion Options:

### Option 1: Online Converter (Easiest)
1. Go to https://convertio.co/svg-png/ or https://cloudconvert.com/svg-to-png
2. Upload the `prestige-ai-logo.svg` file
3. Convert and download the PNG

### Option 2: Using Inkscape (Best Quality)
1. Install Inkscape: https://inkscape.org/
2. Run: `inkscape prestige-ai-logo.svg --export-png=prestige-ai-logo.png --export-dpi=300`

### Option 3: Using ImageMagick
1. Install ImageMagick: `brew install imagemagick` (macOS) or `sudo apt-get install imagemagick` (Linux)
2. Run: `convert prestige-ai-logo.svg -density 300 prestige-ai-logo.png`

### Option 4: Using Browser
1. Open `prestige-ai-logo.svg` in a web browser
2. Right-click and "Save image as..." to save as PNG

## File Information:
- SVG Size: 256x256 pixels
- Recommended PNG DPI: 300 for high quality
- Colors: Purple gradient background, gold crown, green accents
- Features: Animated dots, noise texture, XML tag, crown with gems
"""
    
    with open('logo-conversion-instructions.md', 'w') as f:
        f.write(instructions)
    
    print("📋 Conversion instructions saved as: logo-conversion-instructions.md")
    
    return svg_path

if __name__ == "__main__":
    save_logo_files()