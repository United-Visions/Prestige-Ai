# Terminal Enhancement Plan

## Current Issues to Address

1. **Limited Shell Features**: The current implementation lacks advanced terminal features
2. **Manual Input Handling**: Basic character-by-character input processing
3. **Shell Compatibility**: Hard-coded shell selection logic

## Recommended Enhancements

### 1. Upgrade to node-pty (Recommended)
Replace `child_process.spawn()` with `node-pty` for better terminal emulation:

```bash
npm install node-pty
npm install --save-dev @types/node-pty
```

**Benefits:**
- True PTY (pseudo-terminal) support
- Proper terminal resizing
- Better shell compatibility
- Advanced features like tab completion
- Proper signal handling

### 2. Enhanced Input Handling
Instead of manual character processing, let the shell handle input directly while intercepting special commands.

### 3. Hybrid Command System
- Allow full shell functionality for normal commands
- Intercept and handle special Prestige commands (`fix`, `prestige-help`, etc.)
- Provide visual indicators for AI-assisted features

### 4. Better Shell Detection
```typescript
// Improved shell detection
const getDefaultShell = () => {
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'cmd.exe';
  }
  return process.env.SHELL || '/bin/bash';
};
```

### 5. Alternative: "Open in Terminal" Button
Add a button to open the current app directory in the user's preferred terminal:

```typescript
const openInSystemTerminal = async (appPath: string) => {
  const { shell } = require('electron');
  if (process.platform === 'darwin') {
    shell.openExternal(`terminal://open?dir=${appPath}`);
  } else if (process.platform === 'win32') {
    shell.openExternal(`wt -d ${appPath}`);
  } else {
    shell.openExternal(`gnome-terminal --working-directory=${appPath}`);
  }
};
```

## Implementation Priority

### Phase 1: Quick Wins (Keep current system, add enhancements)
1. Add "Open in System Terminal" button
2. Improve shell detection logic
3. Better error handling for shell spawn failures

### Phase 2: Advanced Features (If node-pty adoption is feasible)
1. Integrate node-pty for better terminal emulation
2. Enhance input handling
3. Add more terminal features (scrollback, search, etc.)

### Phase 3: Hybrid Approach
1. Offer both embedded and external terminal options
2. Let users choose their preferred workflow

## Recommended Action

**Keep the current implementation** but add:
1. **"Open in System Terminal" button** for users who prefer their native terminal
2. **Improved shell compatibility** and error handling
3. **Better command interception** to maintain AI integration features

This provides the best of both worlds - users get the integrated AI features while having the option to use their preferred terminal when needed.