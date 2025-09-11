# 🚀 Prestige AI Auto-Update System

## 📋 Overview

This document explains how the auto-update system works with Prestige AI's separated GitHub repository architecture.

## 🏗️ Architecture

### **Local Development** (Shared Codebase):
```
/Prestige-Ai/
├── electron/main.ts          # Auto-updater configuration
├── src/                      # Electron app source
├── prestige-ai_web/         # Website (deployed separately)
├── release/                 # Build outputs
└── package.json             # Version & build config
```

### **Deployed Separation**:
- **📱 Electron App**: `github.com/United-Visions/Prestige-Ai`
- **🌐 Website**: `github.com/United-Visions/Prestige-AI-web` → Vercel
- **🔗 Live Site**: `https://prestige-ai-web.vercel.app/`

## 🔄 Auto-Update Flow

### **Initial Installation**:
1. User visits `prestige-ai-web.vercel.app`
2. Downloads latest installer (e.g., v0.1.1)
3. App installs with auto-updater enabled

### **Subsequent Updates**:
1. App checks `github.com/United-Visions/Prestige-Ai/releases` every hour
2. When new release detected → downloads automatically
3. User gets notification → app restarts with new version

## 📦 Current Release Status

### **Version History**:
- ✅ **v0.1.0**: Initial release (manual updates only)
- ✅ **v0.1.1**: Auto-updater enabled + GitHub integration

### **Available Builds** (v0.1.1):
- `Prestige-AI-0.1.1-arm64-mac.zip` - Apple Silicon (M1/M2/M3)
- `Prestige-AI-0.1.1-mac.zip` - Intel Mac
- Windows builds pending full rebuild

## 🛠️ Release Process

### **For New Versions**:

1. **Update Version**:
   ```bash
   cd /Prestige-Ai
   # Edit package.json: "version": "0.1.2"
   ```

2. **Build All Platforms**:
   ```bash
   pnpm run build:all
   ```

3. **Commit & Push**:
   ```bash
   git add .
   git commit -m "v0.1.2: [feature description]"
   git push origin main
   ```

4. **Create GitHub Release**:
   ```bash
   git tag v0.1.2
   git push origin v0.1.2
   ```

5. **Upload Build Files**:
   - Go to GitHub Releases
   - Create new release with tag `v0.1.2`
   - Upload files from `/release/` folder
   - Mark as "Latest release"

6. **Auto-Update Triggers**:
   - All users with v0.1.1+ will automatically update
   - No user intervention required

## ⚙️ Technical Configuration

### **Package.json Config**:
```json
{
  "version": "0.1.1",
  "build": {
    "publish": {
      "provider": "github",
      "owner": "United-Visions",
      "repo": "Prestige-Ai"
    }
  }
}
```

### **Auto-Updater Code** (`electron/main.ts`):
```typescript
import { autoUpdater } from 'electron-updater'

// Check for updates every hour
autoUpdater.checkForUpdatesAndNotify()
setInterval(() => {
  autoUpdater.checkForUpdatesAndNotify()
}, 60 * 60 * 1000)
```

## 🔧 Dependencies

### **Required Packages**:
- `electron-updater@^6.6.2` - Auto-update functionality
- `electron-builder` - Building and packaging

### **GitHub Requirements**:
- Repository must be public or have proper access tokens
- Releases must include platform-specific builds
- Proper semantic versioning (e.g., v0.1.1, v0.1.2)

## 📱 Platform Support

### **macOS**:
- ✅ Intel (x64) builds
- ✅ Apple Silicon (arm64) builds
- ⚠️ Requires user to bypass security warning on first install

### **Windows**:
- ✅ 64-bit (x64) builds
- ✅ 32-bit (ia32) builds
- ✅ NSIS installer with auto-update support

### **Linux**:
- 🔄 AppImage format (in development)
- 🔄 Tar.gz archives

## 🚨 Troubleshooting

### **Common Issues**:

1. **Update Not Detected**:
   - Ensure GitHub release is marked as "Latest"
   - Check internet connection
   - Verify app is packaged (not development mode)

2. **Download Fails**:
   - Check GitHub repository permissions
   - Ensure build files are properly uploaded
   - Verify file sizes aren't corrupted

3. **macOS Security Warning**:
   - Expected behavior for unsigned apps
   - Users need to right-click → Open on first install

## 📊 Monitoring

### **Update Logs**:
Auto-updater logs are available in app console:
```
Checking for update...
Update available: {version: "0.1.2"}
Download speed: 1024000 bytes/second
Downloaded 50%
Update downloaded: Installing...
```

### **Success Metrics**:
- Monitor GitHub release download counts
- Track version distribution from user reports
- Website analytics for download page visits

## 🔄 Future Enhancements

### **Planned Features**:
- [ ] Update notifications in app UI
- [ ] Rollback mechanism for failed updates
- [ ] Delta updates for smaller downloads
- [ ] Code signing for macOS/Windows
- [ ] Auto-update settings in preferences

### **Website Integration**:
- [ ] Show "Update Available" banner
- [ ] Version compatibility checker
- [ ] Download statistics dashboard

## 📝 Notes

- Auto-updates only work for packaged apps (not development)
- First install always requires manual download from website
- macOS users will see security warnings until app is signed
- Update frequency can be adjusted in `main.ts`

---

**Last Updated**: August 31, 2025  
**Current Version**: v0.1.1  
**Next Release**: TBD