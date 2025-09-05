# Terminal Upgrade Implementation Guide

## 🎯 Objective
Replace current `child_process.spawn()` terminal implementation with `@homebridge/node-pty-prebuilt-multiarch` while maintaining AI integration features.

## 🔧 Step 1: Install the Package

```bash
cd /Users/deion/Downloads/CCdyad-main/Prestige-Ai
npm install @homebridge/node-pty-prebuilt-multiarch
npm uninstall node-pty  # if you had it installed
```

## 🏗️ Step 2: Update Dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "@homebridge/node-pty-prebuilt-multiarch": "^0.13.1"
  }
}
```

## 🔄 Step 3: Replace Terminal Implementation

### Current vs New Architecture:
- **Current**: `child_process.spawn()` → limited terminal features
- **New**: `node-pty.spawn()` → full PTY support with advanced features

### Key Changes Required:

#### 1. Update Electron Main Process (`electron/main.ts`)

**Replace this section:**
```typescript
// OLD: Around line 812
shellProcess = spawn(shell, shellArgs, {
  cwd: options.cwd,
  env: environment,
  stdio: ['pipe', 'pipe', 'pipe']
});
```

**With:**
```typescript
// NEW: Using node-pty
import * as pty from '@homebridge/node-pty-prebuilt-multiarch';

const shellProcess = pty.spawn(shell, shellArgs, {
  name: 'xterm-256color',
  cols: options.cols,
  rows: options.rows,
  cwd: options.cwd,
  env: environment
});
```

#### 2. Update Event Handlers

**Replace:**
```typescript
// OLD: Separate stdout/stderr handlers
shellProcess.stdout?.on('data', (data: Buffer) => {
  if (mainWindow?.webContents) {
    mainWindow.webContents.send(`terminal:data:${sessionId}`, data.toString());
  }
});

shellProcess.stderr?.on('data', (data: Buffer) => {
  if (mainWindow?.webContents) {
    mainWindow.webContents.send(`terminal:data:${sessionId}`, data.toString());
  }
});
```

**With:**
```typescript
// NEW: Single data handler (PTY combines stdout/stderr)
shellProcess.onData((data: string) => {
  if (mainWindow?.webContents) {
    mainWindow.webContents.send(`terminal:data:${sessionId}`, data);
  }
});
```

#### 3. Update Process Control

**Replace:**
```typescript
// OLD: Basic write to stdin
session.process.stdin?.write(data);
```

**With:**
```typescript
// NEW: PTY write method
session.process.write(data);
```

#### 4. Update Process Termination

**Replace:**
```typescript
// OLD: Basic kill
session.process.kill('SIGTERM');
```

**With:**
```typescript
// NEW: PTY kill method
session.process.kill(); // or session.process.kill('SIGTERM')
```

#### 5. Update Resize Handling

**Replace current resize handler with:**
```typescript
// NEW: Real PTY resize support
ipcMain.handle('terminal:resize', async (_, sessionId: string, cols: number, rows: number): Promise<boolean> => {
  const session = terminalSessions.get(sessionId);
  if (!session) {
    return false;
  }

  try {
    session.process.resize(cols, rows);
    return true;
  } catch (error) {
    console.error(`Failed to resize terminal session ${sessionId}:`, error);
    return false;
  }
});
```

## 🎨 Step 4: Enhanced Features You'll Get

### 1. Better Shell Compatibility
```typescript
// Improved shell detection
const getShell = () => {
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'cmd.exe';
  }
  return process.env.SHELL || '/bin/bash';
};
```

### 2. Advanced Terminal Features
- Tab completion works properly
- Command history navigation
- Proper signal handling (Ctrl+C, etc.)
- Better Unicode support
- True color support

### 3. Maintain Your AI Integration
Keep all your existing special command handling:
```typescript
// Your existing special commands still work
const handleSpecialCommand = (command: string, terminal: Terminal): boolean => {
  switch (cmd) {
    case 'fix-errors':
    case 'fix':
      // Your existing AI integration code
      return true;
    // ... rest of your special commands
  }
};
```

## 🔧 Step 5: Update Frontend (RealTerminal.tsx)

The frontend changes are minimal - just need to handle the improved data flow:

```typescript
// The xterm.js integration remains the same
terminal.onData((data) => {
  if (!sessionId.current) return;
  window.electronAPI?.terminal.write(sessionId.current, data);
});

// Data handling remains the same
window.electronAPI?.terminal.onData(sessionResult.sessionId, (data: string) => {
  terminal.write(data);
  monitorForErrors(data); // Your existing error monitoring
});
```

## ⚡ Benefits You'll Get

### Performance Improvements
- **Faster startup** - No compilation, prebuilt binaries
- **Better terminal performance** - True PTY vs process pipes
- **Proper terminal resizing** - No more resize warnings

### Feature Improvements
- **Tab completion** - Works properly now
- **Command history** - Up/down arrows work
- **Signal handling** - Ctrl+C, Ctrl+Z work correctly
- **Unicode support** - Better emoji and international character support
- **Shell features** - All native shell features work

### Development Improvements
- **Easier installation** - No build tools required
- **Cross-platform** - Same code works on all platforms
- **Better debugging** - Proper PTY error messages

## 🚀 Implementation Steps Summary

1. **Install package**: `npm install @homebridge/node-pty-prebuilt-multiarch`
2. **Update main.ts**: Replace spawn calls with pty.spawn
3. **Update event handlers**: Use onData instead of stdout/stderr
4. **Test thoroughly**: Verify AI commands still work
5. **Deploy**: Users get better terminal experience

## 🧪 Testing Checklist

- [ ] Terminal starts correctly
- [ ] Special commands (`fix`, `prestige-help`) work
- [ ] Claude Code CLI integration works  
- [ ] Aider CLI integration works
- [ ] Terminal resizing works
- [ ] Tab completion works
- [ ] Command history works (up/down arrows)
- [ ] Unicode characters display correctly
- [ ] Ctrl+C/Ctrl+Z signals work
- [ ] App switching maintains terminal sessions

## 🎉 Result

You'll have a **professional-grade terminal** that rivals VS Code's integrated terminal while keeping all your unique AI integration features!