# Prestige-AI Distribution Guide

This guide explains how to package and distribute the Prestige-AI application for Mac and Windows users.

## Quick Start

### 1. Build for Distribution

To build the application for your current platform:

```bash
# For macOS (from Mac)
npm run package:mac

# For Windows (from Windows or Mac with wine)
npm run package:win

# For all platforms (requires proper setup)
npm run package:all

# Complete release build with download site setup
npm run release
```

### 2. Start Download Site

```bash
# Start the download website locally
npm run serve:downloads
```

Then visit `http://localhost:3000` to see your download page.

## Detailed Instructions

### Prerequisites

1. **Node.js** (v18 or later)
2. **npm** or **yarn**
3. For cross-platform builds:
   - **macOS**: Can build for Mac and Windows
   - **Windows**: Can build for Windows
   - **Linux**: Can build for Linux

### Building for Distribution

#### Option 1: Platform-Specific Builds

```bash
# Build for macOS only
npm run build:mac

# Build for Windows only  
npm run build:win

# Build for Linux only
npm run build:linux
```

#### Option 2: Complete Release Process

```bash
# This will:
# 1. Clean previous builds
# 2. Install dependencies
# 3. Build for available platforms
# 4. Copy files to download-site/downloads/
# 5. Generate version.json for the website
npm run release
```

### Generated Files

After building, you'll find distribution files in the `release/` directory:

- **macOS**: `.dmg` and `.zip` files
- **Windows**: `.exe` installer and `.zip` files  
- **Linux**: `.AppImage` and `.tar.gz` files

### Download Website

The download website is located in `download-site/` and includes:

- `index.html` - Beautiful download page
- `server.js` - Simple Node.js server
- `downloads/` - Directory containing the actual app files
- `downloads/version.json` - Metadata for the website

#### Website Features

- **Responsive design** that works on all devices
- **Automatic file detection** based on version.json
- **Platform-specific downloads** (Mac, Windows, Linux)
- **File size display** for each download
- **Version information** and build dates

#### Deploying the Website

##### Option 1: Local Server (Development)

```bash
npm run serve:downloads
# Visit http://localhost:3000
```

##### Option 2: Static File Hosting

Upload the entire `download-site/` directory to any web host:

- **Netlify**: Drag and drop the folder
- **Vercel**: Connect your Git repository
- **GitHub Pages**: Push to a `gh-pages` branch
- **AWS S3**: Upload as static website
- **Any web server**: Upload via FTP/SFTP

##### Option 3: Node.js Hosting

Deploy `download-site/` to any Node.js hosting platform:

- **Heroku**
- **Railway**
- **DigitalOcean App Platform**
- **Google Cloud Run**

## File Structure

```
Prestige-Ai/
├── release/                    # Built applications
│   ├── Prestige-AI-0.1.0.dmg     # macOS installer
│   ├── Prestige-AI-0.1.0.exe     # Windows installer
│   └── Prestige-AI-0.1.0.zip     # Cross-platform zip
├── download-site/              # Download website
│   ├── index.html                 # Main page
│   ├── server.js                  # Node.js server
│   ├── package.json               # Server dependencies
│   └── downloads/                 # Download files
│       ├── version.json           # Version metadata
│       ├── Prestige-AI-0.1.0.dmg # macOS app
│       └── Prestige-AI-0.1.0.exe # Windows app
└── scripts/
    └── build-releases.js       # Build automation script
```

## Configuration

### Customizing the Build

Edit `package.json` build configuration:

```json
{
  "build": {
    "appId": "com.prestige-ai.app",
    "productName": "Prestige-AI",
    "mac": {
      "category": "public.app-category.developer-tools"
    },
    "win": {
      "target": "nsis"
    }
  }
}
```

### Adding Icons

Place your app icons in `assets/icon/`:

- `icon.icns` - macOS icon
- `icon.ico` - Windows icon  
- `icon.png` - Linux icon (512x512px)

### Customizing the Website

Edit `download-site/index.html` to:

- Change colors and styling
- Update app description
- Add screenshots or features
- Modify download page layout

## Troubleshooting

### Common Issues

1. **Build fails on different platforms**
   - Install platform-specific build tools
   - Use Docker for consistent builds
   - Use GitHub Actions for automated builds

2. **Missing icons or assets**
   - Ensure icon files are in `assets/icon/`
   - Check file paths in package.json

3. **Website not showing downloads**
   - Verify `downloads/version.json` exists
   - Check file permissions
   - Ensure server is serving static files correctly

### Getting Help

- Check the [Electron Builder documentation](https://www.electron.build/)
- Review build logs for specific error messages
- Test builds on target platforms before distribution

## Automation with CI/CD

Consider setting up automated builds with:

- **GitHub Actions** - Build on every release tag
- **GitLab CI** - Cross-platform building
- **CircleCI** - Automated testing and building

Example GitHub Action workflow available in `.github/workflows/` (create if needed).

## Security Notes

- **Code signing**: Set up certificates for production releases
- **Auto-updates**: Consider implementing auto-update functionality
- **Virus scanning**: Test releases with antivirus software
- **HTTPS**: Use HTTPS for download website in production