# 📱 Prestige-AI Installation Guide

## 🍎 **macOS Installation**

### ⚠️ **Important Security Notice**
When first opening Prestige-AI on macOS, you'll see this warning:
> *"Apple could not verify 'Prestige-AI' is free of malware that may harm your Mac or compromise your privacy."*

**This is completely normal!** Here's how to safely open the app:

### 📋 **Step-by-Step Instructions**

#### **Method 1: Right-Click to Open** ⭐ *Recommended*
1. **Download** the `.dmg` file
2. **Double-click** the `.dmg` to mount it
3. **Drag** Prestige-AI.app to your Applications folder
4. **Go to Applications folder**
5. **❌ DON'T double-click** the app yet
6. **✅ Right-click** (or Control+click) on `Prestige-AI.app`
7. **Select "Open"** from the context menu
8. **Click "Open"** in the security warning dialog
9. **🎉 Success!** The app will now run normally

#### **Method 2: System Preferences**
1. Try to open the app normally (you'll get the warning)
2. Go to **System Preferences** → **Security & Privacy** → **General**
3. You'll see a message about "Prestige-AI" being blocked
4. Click **"Open Anyway"**
5. Enter your password when prompted

#### **Method 3: Terminal Command** (Advanced)
```bash
xattr -d com.apple.quarantine /Applications/Prestige-AI.app
```

### 🔄 **After First Launch**
Once you've opened the app using any of these methods, macOS will remember your choice and allow normal double-click opening in the future.

---

## 🪟 **Windows Installation**

### 📋 **Step-by-Step Instructions**
1. **Download** the `.exe` installer
2. **Double-click** the installer
3. **Follow** the installation wizard
4. **Launch** from Start Menu or Desktop shortcut

### ⚠️ **Windows Defender Notice**
Windows may show a "Windows protected your PC" warning:
1. Click **"More info"**
2. Click **"Run anyway"**
3. The installer will proceed normally

---

## ❓ **Why These Warnings Appear**

### **It's Not Malware!**
These security warnings appear because:
- The app isn't **code-signed** with expensive certificates ($99/year for Apple, $300+/year for Windows)
- Operating systems are cautious about unsigned applications
- This is standard for many open-source and independent applications

### **Your Security Isn't Compromised**
- The app is completely safe to use
- These are just precautionary warnings
- Thousands of legitimate apps require these same steps

---

## 🆘 **Troubleshooting**

### **macOS: "The application cannot be opened"**
- Make sure you downloaded the correct version (Intel vs Apple Silicon)
- Try the right-click method described above
- Check that the app is in your Applications folder

### **Windows: "App can't run on this PC"**
- Download the correct architecture (64-bit vs 32-bit)
- Make sure you have Windows 10 or later
- Try running as administrator

### **Still Having Issues?**
1. Check our FAQ section
2. Visit our support page
3. Contact us with your specific error message

---

## 🎯 **Quick Reference Card**

### **macOS Users:**
```
1. Download .dmg → 2. Drag to Applications → 3. Right-click app → 4. Select "Open" → 5. Click "Open" in dialog
```

### **Windows Users:**
```
1. Download .exe → 2. Run installer → 3. If warned, click "More info" → 4. Click "Run anyway"
```

---

## 🔗 **Need More Help?**

- 📧 Email: support@prestige-ai.com
- 💬 Discord: [Join our community]
- 🐛 Bug Reports: [GitHub Issues]
- 📖 Documentation: [User Guide]

**Remember:** These security steps are only needed the first time you install and run the app!