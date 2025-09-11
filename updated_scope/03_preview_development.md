# Preview & Development Environment

## Overview
CCDyad provides a sophisticated live preview system that automatically starts development servers and displays applications in an embedded iframe with real-time updates.

## Automatic App Startup

### 1. App Server Management (`/src/ipc/handlers/app_handlers.ts`)

**Automatic Startup Process:**
```typescript
ipcMain.handle("run-app", async (event, { appId }: { appId: number }) => {
  return withLock(appId, async () => {
    // Check if already running
    if (runningApps.has(appId)) {
      logger.debug(`App ${appId} is already running.`);
      return;
    }

    const app = await db.query.apps.findFirst({ where: eq(apps.id, appId) });
    if (!app) throw new Error("App not found");

    const appPath = getDyadAppPath(app.path);
    
    // Kill any orphaned processes on port 32100
    await killProcessOnPort(32100);
    
    // Start the app
    await executeApp({ appPath, appId, event });
  });
});
```

**Development Server Command:**
```typescript
async function executeAppLocalNode({ appPath, appId, event }) {
  const process = spawn(
    "(pnpm install && pnpm run dev --port 32100) || (npm install --legacy-peer-deps && npm run dev -- --port 32100)",
    [],
    {
      cwd: appPath,
      shell: true,
      stdio: "pipe",
      detached: false,
    },
  );
  
  // Process management
  const currentProcessId = processCounter.increment();
  runningApps.set(appId, { process, processId: currentProcessId });
}
```

**Key Features:**
- **Fixed Port**: Always uses port `32100`
- **Package Manager**: Tries `pnpm` first, fallback to `npm`
- **Auto-install**: Runs `install` before starting dev server
- **Process Tracking**: Maintains map of running processes

### 2. Process Management (`/src/ipc/utils/process_manager.ts`)

```typescript
// Global process tracking
export const runningApps = new Map<number, { process: ChildProcess; processId: number }>();
export const processCounter = {
  value: 0,
  increment() {
    return ++this.value;
  }
};

export function removeAppIfCurrentProcess(appId: number, targetProcess: ChildProcess) {
  const appInfo = runningApps.get(appId);
  if (appInfo && appInfo.process === targetProcess) {
    runningApps.delete(appId);
    logger.log(`Removed app ${appId} from running apps map.`);
  }
}
```

## Live Preview System

### 1. Preview Panel (`/src/components/preview_panel/PreviewPanel.tsx`)

**Main Preview Component:**
```tsx
export function PreviewPanel() {
  const [previewMode, setPreviewMode] = useAtom(previewModeAtom);
  const { runApp, stopApp, restartApp, loading, app, refreshAppIframe } = useRunApp();
  const key = useAtomValue(previewPanelKeyAtom);

  useEffect(() => {
    const previousAppId = runningAppIdRef.current;
    
    // Auto-start apps when selected
    if (selectedAppId !== previousAppId) {
      if (previousAppId !== null) {
        stopApp(previousAppId); // Stop previous app
      }
      if (selectedAppId !== null) {
        runApp(selectedAppId); // Start new app
      }
    }
  }, [selectedAppId]);

  return (
    <div className="flex flex-col h-full">
      <PreviewHeader {...headerProps} />
      {previewMode === "preview" && (
        <PreviewIframe key={key} loading={loading} />
      )}
      {/* Console and other modes */}
    </div>
  );
}
```

### 2. Preview Iframe (`/src/components/preview_panel/PreviewIframe.tsx`)

**Iframe Component:**
```tsx
export const PreviewIframe = ({ loading }: { loading: boolean }) => {
  const { appUrl, originalUrl } = useAtomValue(appUrlAtom);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="flex-1 flex flex-col">
      {loading && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="animate-spin mr-2" size={16} />
          Loading app preview...
        </div>
      )}
      
      {appUrl && (
        <iframe
          ref={iframeRef}
          key={reloadKey}
          src={appUrl}
          data-testid="preview-iframe-element"
          className="flex-1 border-0 w-full"
          onLoad={() => {
            // Initialize component selector and navigation
            if (iframeRef.current?.contentWindow) {
              iframeRef.current.contentWindow.postMessage(
                { type: "dyad-init-component-selector" },
                "*"
              );
            }
          }}
        />
      )}
    </div>
  );
};
```

### 3. URL Management & Proxy System

**App URL Processing (`/src/hooks/useRunApp.ts`):**
```typescript
const processProxyServerOutput = (output: AppOutput) => {
  const matchesProxyServerStart = output.message.includes("[dyad-proxy-server]started=[");
  
  if (matchesProxyServerStart) {
    const proxyUrlMatch = output.message.match(/\[dyad-proxy-server\]started=\[(.*?)\]/);
    const originalUrlMatch = output.message.match(/original=\[(.*?)\]/);

    if (proxyUrlMatch && proxyUrlMatch[1]) {
      setAppUrlObj({
        appUrl: proxyUrlMatch[1], // Proxy URL for iframe
        appId: appId,
        originalUrl: originalUrlMatch ? originalUrlMatch[1] : null,
      });
    }
  }
};
```

**Proxy Server (`/src/ipc/utils/start_proxy_server.ts`):**
- **Purpose**: Handles CORS and iframe embedding
- **Flow**: `localhost:32100` → `proxy URL` → `iframe`
- **Features**: Request/response interception, header modification

## Development Console

### 1. Console Component (`/src/components/preview_panel/Console.tsx`)

```tsx
export const Console = () => {
  const appOutput = useAtomValue(appOutputAtom);
  
  return (
    <div className="font-mono text-xs px-4 h-full overflow-auto">
      {appOutput.map((output, index) => (
        <div key={index}>{output.message}</div>
      ))}
    </div>
  );
};
```

**Console Features:**
- **Read-only**: Users cannot input commands
- **Real-time**: Shows live server output
- **Categorized**: Different message types (stdout, stderr, client-error)

### 2. Output Processing

**Server Output Capture:**
```typescript
// Capture stdout
process.stdout?.on("data", async (data) => {
  const message = util.stripVTControlCharacters(data.toString());
  logger.debug(`App ${appId} stdout: ${message}`);

  safeSend(event.sender, "app:output", {
    type: "stdout",
    message,
    appId,
  });

  // Detect URL and start proxy
  const urlMatch = message.match(/(https?:\/\/localhost:\d+\/?)/);
  if (urlMatch) {
    proxyWorker = await startProxy(urlMatch[1], {
      onStarted: (proxyUrl) => {
        safeSend(event.sender, "app:output", {
          type: "stdout", 
          message: `[dyad-proxy-server]started=[${proxyUrl}] original=[${urlMatch[1]}]`,
          appId,
        });
      },
    });
  }
});

// Capture stderr
process.stderr?.on("data", (data) => {
  const message = util.stripVTControlCharacters(data.toString());
  safeSend(event.sender, "app:output", {
    type: "stderr",
    message,
    appId,
  });
});
```

## Preview Controls

### 1. Preview Header Controls

**Available Actions:**
- **Preview/Code/Problems**: Toggle between different view modes
- **Restart**: Restart development server
- **Rebuild**: Delete node_modules and reinstall
- **Refresh**: Reload iframe
- **Clear Cache**: Clear browser cache and local storage

**Restart Implementation:**
```typescript
const restartApp = useCallback(async ({ removeNodeModules = false } = {}) => {
  if (appId === null) return;
  
  setLoading(true);
  try {
    const ipcClient = IpcClient.getInstance();
    
    // Clear URL and show restart message
    setAppUrlObj({ appUrl: null, appId: null, originalUrl: null });
    setAppOutput(prev => [...prev, {
      message: "Restarting app...",
      type: "stdout",
      appId,
      timestamp: Date.now(),
    }]);

    await ipcClient.restartApp(appId, (output) => {
      setAppOutput(prev => [...prev, output]);
      
      // Detect HMR updates
      if (output.message.includes("hmr update") && output.message.includes("[vite]")) {
        onHotModuleReload();
        return;
      }
      
      processProxyServerOutput(output);
    }, removeNodeModules);
    
  } catch (error) {
    setPreviewErrorMessage(error instanceof Error ? error.message : error?.toString());
  } finally {
    setPreviewPanelKey(prevKey => prevKey + 1);
    setLoading(false);
  }
}, [appId]);
```

### 2. Hot Module Reload (HMR)

**HMR Detection:**
```typescript
if (output.message.includes("hmr update") && output.message.includes("[vite]")) {
  onHotModuleReload();
  return;
}

const onHotModuleReload = useCallback(() => {
  setPreviewPanelKey((prevKey) => prevKey + 1);
}, [setPreviewPanelKey]);
```

**Auto-Refresh on Changes:**
- **File changes** trigger Vite HMR
- **HMR messages** detected in console output
- **Iframe key updated** to force refresh
- **Seamless updates** without full restart

## Interactive Features

### 1. Component Selection

**Component Picker:**
```typescript
const activateComponentSelector = () => {
  setIsPicking(true);
  if (iframeRef.current?.contentWindow) {
    iframeRef.current.contentWindow.postMessage(
      { type: "activate-dyad-component-selector" },
      "*"
    );
  }
};

// Handle component selection
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === "dyad-component-selected") {
      setSelectedComponentPreview(parseComponentSelection(event.data));
      setIsPicking(false);
      return;
    }
  };
  
  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
}, []);
```

### 2. Navigation Controls

**Route Detection:**
```typescript
useEffect(() => {
  if (routerContent) {
    const routes: Array<{ path: string; label: string }> = [];
    const routePathsRegex = /<Route\s+(?:[^>]*\s+)?path=["']([^"']+)["']/g;
    let match;

    while ((match = routePathsRegex.exec(routerContent)) !== null) {
      const path = match[1];
      const label = path === "/" ? "Home" : 
        path.split("/").filter(segment => segment && !segment.startsWith(":"))
            .pop()?.replace(/[-_]/g, " ").replace(/^\w/, c => c.toUpperCase()) || path;

      routes.push({ path, label });
    }
    
    setAvailableRoutes(routes);
  }
}, [routerContent]);
```

## Error Handling

### 1. Error Detection

**Multiple Error Sources:**
- **Build errors**: TypeScript/compilation failures
- **Runtime errors**: JavaScript exceptions in iframe
- **Server errors**: Development server crashes
- **Network errors**: Connection/proxy issues

```typescript
const { type, payload } = event.data as {
  type: "window-error" | "unhandled-rejection" | "iframe-sourcemapped-error" | "build-error-report";
  payload?: { message?: string; stack?: string; };
};

if (type === "window-error" || type === "unhandled-rejection" || type === "iframe-sourcemapped-error") {
  const errorMessage = `Error ${payload?.message}\nStack trace: ${payload?.stack}`;
  setErrorMessage(errorMessage);
  setAppOutput(prev => [...prev, {
    message: `Iframe error: ${errorMessage}`,
    type: "client-error",
    appId: selectedAppId!,
    timestamp: Date.now(),
  }]);
}
```

### 2. AI Error Fixing

**Fix Error Button:**
```tsx
const PreviewErrorBanner = ({ errorMessage, onFixError }: PreviewErrorBannerProps) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
    <div className="flex items-start gap-3">
      <AlertTriangle className="text-red-500 mt-0.5" size={16} />
      <div className="flex-1">
        <h3 className="font-medium text-red-800 mb-1">Preview Error</h3>
        <p className="text-sm text-red-700 whitespace-pre-wrap font-mono">{errorMessage}</p>
      </div>
      <button onClick={onFixError} className="btn-primary">
        <Sparkles size={14} />
        <span>Fix error with AI</span>
      </button>
    </div>
  </div>
);
```

## Preview Modes

### 1. Mode Toggle System

**Three Preview Modes:**
- **Preview**: Live iframe of the application
- **Code**: File explorer and code view
- **Problems**: Error detection and fixing interface

**Mode Implementation:**
```tsx
const PreviewHeader = ({ previewMode, setPreviewMode, onRestart, onCleanRestart }) => {
  const modes = [
    { id: "preview", label: "Preview", icon: Eye },
    { id: "code", label: "Code", icon: Code },
    { id: "problems", label: "Problems", icon: AlertTriangle },
  ];

  return (
    <div className="flex items-center gap-1 p-2 border-b">
      {modes.map(mode => (
        <button
          key={mode.id}
          onClick={() => setPreviewMode(mode.id)}
          className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors", {
            "bg-blue-500 text-white": previewMode === mode.id,
            "text-muted-foreground hover:text-foreground": previewMode !== mode.id,
          })}
        >
          <mode.icon size={16} className="mr-1" />
          {mode.label}
        </button>
      ))}
    </div>
  );
};
```

## Related Files

- **Preview Panel**: `/src/components/preview_panel/PreviewPanel.tsx`
- **Preview Iframe**: `/src/components/preview_panel/PreviewIframe.tsx`
- **Console**: `/src/components/preview_panel/Console.tsx`
- **App Management**: `/src/hooks/useRunApp.ts`
- **App Handlers**: `/src/ipc/handlers/app_handlers.ts`
- **Process Manager**: `/src/ipc/utils/process_manager.ts`
- **Proxy Server**: `/src/ipc/utils/start_proxy_server.ts`