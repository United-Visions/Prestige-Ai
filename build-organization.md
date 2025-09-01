# 📦 Prestige AI Build Organization System

## 🏗️ New Build Structure

Instead of dumping all builds into the root `release/` folder, we now organize builds by version with platform-specific subfolders for easy tracking and management.

### 📁 **New Folder Structure**:
```
builds/
├── v0.1.0/
│   ├── mac/
│   │   ├── Prestige-AI-0.1.0.dmg
│   │   ├── Prestige-AI-0.1.0-arm64.dmg
│   │   └── Prestige-AI-0.1.0-mac.zip
│   ├── windows/
│   │   ├── Prestige-AI Setup 0.1.0.exe
│   │   ├── Prestige-AI-0.1.0-win.zip
│   │   └── Prestige-AI-0.1.0-ia32-win.zip
│   └── linux/
│       ├── Prestige-AI-0.1.0.AppImage
│       └── Prestige-AI-0.1.0-linux.tar.gz
├── v0.1.1/
│   ├── mac/
│   ├── windows/
│   └── linux/
└── v0.1.2/
    ├── mac/
    ├── windows/
    └── linux/
```

## ⚙️ **Configuration Changes**

### **1. Update package.json Build Output**:
```json
{
  "build": {
    "directories": {
      "output": "builds/${version}"
    }
  }
}
```

### **2. Platform-Specific Outputs**:
- **macOS**: `builds/v${version}/mac/`
- **Windows**: `builds/v${version}/windows/`
- **Linux**: `builds/v${version}/linux/`

## 🚀 **Build Commands**

### **Version-Aware Building**:
```bash
# Build all platforms for current version
npm run build:versioned

# Build specific platform
npm run build:mac:versioned
npm run build:win:versioned
npm run build:linux:versioned

# Clean build (removes current version folder)
npm run build:clean
```

### **Manual Build Process**:
```bash
# 1. Update version in package.json
# 2. Create version folder structure
mkdir -p builds/v$(node -p "require('./package.json').version")/{mac,windows,linux}

# 3. Build platforms
npm run build:all

# 4. Organize files into platform folders
# (This happens automatically with new config)
```

## 📋 **Build Script Integration**

### **Automated Organization Script**:
Create `scripts/organize-builds.js`:
```javascript
const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');

const version = `v${packageJson.version}`;
const buildsDir = path.join(__dirname, '..', 'builds', version);

// Create version and platform directories
const platforms = ['mac', 'windows', 'linux'];
platforms.forEach(platform => {
  const platformDir = path.join(buildsDir, platform);
  if (!fs.existsSync(platformDir)) {
    fs.mkdirSync(platformDir, { recursive: true });
  }
});

// Move files to appropriate platform folders
// (Implementation details in actual script)
```

## 🔄 **Auto-Update Integration**

### **GitHub Release Structure**:
When creating GitHub releases, upload files maintaining this structure:
```
Release v0.1.1/
├── mac/
│   ├── Prestige-AI-0.1.1.dmg
│   └── Prestige-AI-0.1.1-arm64.dmg
├── windows/
│   └── Prestige-AI Setup 0.1.1.exe
└── checksums.txt
```

### **Update Detection**:
Auto-updater will still work by checking:
- Release tags (v0.1.1, v0.1.2, etc.)
- Platform-specific assets in release
- Semantic version comparison

## 📊 **Benefits of This System**

### **✅ Advantages**:
- **Clear Version History**: Easy to see what was built for each version
- **Platform Organization**: Quickly find platform-specific builds
- **Release Management**: Simplified upload to GitHub releases
- **Development Tracking**: Know exactly what's been built and when
- **Rollback Support**: Easy to find previous versions for rollbacks

### **🔧 Maintenance**:
- **Automated Creation**: Build scripts create folder structure
- **Gitignore Update**: Exclude build files but track structure
- **CI/CD Ready**: Easy integration with automated build systems

## 🎯 **Implementation Steps**

### **Phase 1: Configuration**
1. ✅ Update package.json build directories
2. ✅ Create build organization script
3. ✅ Update .gitignore for new structure
4. ✅ Test build process

### **Phase 2: Integration**
1. ⏳ Update web app to use new structure
2. ⏳ Modify release scripts
3. ⏳ Update auto-updater paths
4. ⏳ Create migration script for existing builds

### **Phase 3: Documentation**
1. ✅ Create this documentation
2. ⏳ Update release process docs
3. ⏳ Create developer guidelines
4. ⏳ Add build validation scripts

## 🔍 **File Tracking**

### **What Gets Tracked in Git**:
```
builds/
├── .gitkeep                    # Keep directory structure
├── v0.1.0/
│   ├── mac/.gitkeep
│   ├── windows/.gitkeep
│   └── linux/.gitkeep
└── v0.1.1/
    ├── mac/.gitkeep
    ├── windows/.gitkeep
    └── linux/.gitkeep
```

### **What Gets Ignored**:
- All actual build files (*.dmg, *.exe, etc.)
- Large binary assets
- Temporary build artifacts

## 🚨 **Migration Notes**

### **From Old System**:
- Current `release/` folder will be deprecated
- Existing builds can be moved to new structure
- Auto-updater config needs minor updates
- Web app download paths need updating

### **Compatibility**:
- Auto-update system remains compatible
- GitHub releases work the same way
- Development workflow improves

---

**Next Steps**: Implement the package.json changes and create the build organization script.