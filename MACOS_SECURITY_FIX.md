# 🔒 Fixing macOS "Malware" Warning for Prestige-AI

## ❗ **The Problem**
macOS shows: *"Apple could not verify 'Prestige-AI' is free of malware"*

This happens because the app isn't **code-signed** with an Apple Developer certificate.

## ✅ **Quick Fix for Users (Choose One):**

### **Method 1: Right-Click to Open** ⭐ *Recommended*
1. **Right-click** on `Prestige-AI.app` in Applications folder
2. Select **"Open"** from the menu
3. Click **"Open"** in the warning dialog
4. ✅ App will run and be trusted forever

### **Method 2: System Preferences**
1. Try to open the app (get the warning)
2. Go to **System Preferences** → **Security & Privacy** → **General**
3. Click **"Open Anyway"** next to the Prestige-AI message
4. Enter your password

### **Method 3: Terminal Command**
```bash
# Remove quarantine attribute
xattr -d com.apple.quarantine /Applications/Prestige-AI.app

# Or temporarily disable Gatekeeper
sudo spctl --master-disable
# (Remember to re-enable: sudo spctl --master-enable)
```

## 🛡️ **For Developers: Prevent This Issue**

### **Get Apple Developer Account** ($99/year)
1. Join [Apple Developer Program](https://developer.apple.com/programs/)
2. Get Developer ID certificates
3. Code sign your app

### **Free Alternative: Self-Signed Certificate**
```bash
# Create self-signed certificate
security create-keychain -p mysecretpassword build.keychain
security default-keychain -s build.keychain
security unlock-keychain -p mysecretpassword build.keychain

# Add to Electron Builder config
export CSC_NAME="Your Name"
npm run build:mac
```

### **Updated Build Configuration**
I've already updated your `package.json` with:
- Hardened Runtime enabled
- Entitlements for Electron apps
- Gatekeeper assessment disabled

## 📝 **Instructions for Your Users**

Add this to your download page or README:

> **macOS Security Notice**: When first opening Prestige-AI, you may see a security warning. This is normal for apps not distributed through the Mac App Store. Simply **right-click** the app and select **"Open"** to bypass this one-time warning.

## 🎯 **Next Steps**

1. **For immediate use**: Use Method 1 (right-click + open)
2. **For distribution**: Consider getting Apple Developer account
3. **Alternative**: Include clear instructions for users

The app is completely safe - this is just Apple's security measure for unsigned applications.