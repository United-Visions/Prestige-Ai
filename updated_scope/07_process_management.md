# Process Management & Server System

## Overview
CCDyad implements a sophisticated process management system for running development servers, managing app lifecycles, and handling background processes across multiple applications simultaneously.

## Core Process Manager

### 1. Process Manager (`/src/main/process_manager.ts`)

**Process Tracking Structure:**
```typescript
interface ProcessInfo {
  pid: number;
  port: number;
  appId: number;
  command: string;
  startTime: Date;
  status: 'starting' | 'running' | 'stopped' | 'error';
  lastError?: string;
}

class ProcessManager {
  private processes = new Map<number, ProcessInfo>();
  private portManager = new PortManager();

  async startApp(appId: number, appPath: string): Promise<ProcessInfo> {
    // Implementation details...
  }

  async stopApp(appId: number): Promise<void> {
    // Implementation details...
  }

  getProcessInfo(appId: number): ProcessInfo | undefined {
    return this.processes.get(appId);
  }

  getAllProcesses(): ProcessInfo[] {
    return Array.from(this.processes.values());
  }
}
```

### 2. Development Server Management

**Server Startup Logic (`/src/ipc/handlers/app_handlers.ts`):**
```typescript
async function executeApp(
  _: IpcMainInvokeEvent,
  appId: number
): Promise<{ success: boolean; port?: number; error?: string }> {
  try {
    const app = await db.query.apps.findFirst({
      where: eq(apps.id, appId),
    });

    if (!app) {
      throw new Error(`App with ID ${appId} not found`);
    }

    const appPath = getDyadAppPath(app.path);

    if (!fs.existsSync(appPath)) {
      throw new Error(`App directory not found: ${appPath}`);
    }

    // Check if app is already running
    const existingProcess = processManager.getProcessInfo(appId);
    if (existingProcess && existingProcess.status === 'running') {
      logger.debug(`App ${appId} is already running on port ${existingProcess.port}`);
      return {
        success: true,
        port: existingProcess.port,
      };
    }

    // Start the development server
    const processInfo = await processManager.startApp(appId, appPath);

    logger.info(`App ${appId} started successfully on port ${processInfo.port}`);
    return {
      success: true,
      port: processInfo.port,
    };
  } catch (error) {
    logger.error(`Failed to execute app ${appId}:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
}
```

### 3. Port Management

**Dynamic Port Allocation:**
```typescript
class PortManager {
  private usedPorts = new Set<number>();
  private readonly START_PORT = 32100;
  private readonly MAX_PORT = 65535;

  async getAvailablePort(): Promise<number> {
    for (let port = this.START_PORT; port <= this.MAX_PORT; port++) {
      if (!this.usedPorts.has(port) && await this.isPortAvailable(port)) {
        this.usedPorts.add(port);
        return port;
      }
    }
    throw new Error('No available ports found');
  }

  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      server.on('error', () => resolve(false));
    });
  }

  releasePort(port: number): void {
    this.usedPorts.delete(port);
  }
}
```

## Process Lifecycle Management

### 1. Process Creation

**Development Server Spawn:**
```typescript
async function startDevServer(appPath: string, port: number): Promise<ChildProcess> {
  const packageJsonPath = path.join(appPath, 'package.json');
  const packageManager = await detectPackageManager(appPath);

  // Determine start command
  let command: string;
  let args: string[];

  if (packageManager === 'pnpm') {
    command = 'pnpm';
    args = ['dev', '--port', port.toString(), '--host'];
  } else {
    command = 'npm';
    args = ['run', 'dev', '--', '--port', port.toString(), '--host'];
  }

  // Spawn process with proper environment
  const childProcess = spawn(command, args, {
    cwd: appPath,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: port.toString(),
      HOST: '0.0.0.0',
    },
    shell: process.platform === 'win32',
  });

  // Set up process monitoring
  setupProcessMonitoring(childProcess, appPath);

  return childProcess;
}
```

### 2. Process Monitoring

**Health Checks and Recovery:**
```typescript
function setupProcessMonitoring(childProcess: ChildProcess, appPath: string): void {
  let serverReady = false;
  let startupTimeout: NodeJS.Timeout;

  // Monitor stdout for server ready signals
  childProcess.stdout?.on('data', (data) => {
    const output = data.toString();
    logger.debug(`[${appPath}] STDOUT: ${output}`);

    // Check for server ready indicators
    if (output.includes('Local:') || 
        output.includes('ready in') || 
        output.includes('server running at')) {
      serverReady = true;
      if (startupTimeout) {
        clearTimeout(startupTimeout);
      }
    }
  });

  // Monitor stderr for errors
  childProcess.stderr?.on('data', (data) => {
    const output = data.toString();
    logger.warn(`[${appPath}] STDERR: ${output}`);

    // Check for critical errors
    if (output.includes('EADDRINUSE') || 
        output.includes('port already in use')) {
      logger.error(`Port conflict detected for ${appPath}`);
      // Handle port conflict...
    }
  });

  // Handle process exit
  childProcess.on('exit', (code, signal) => {
    logger.info(`[${appPath}] Process exited with code ${code}, signal ${signal}`);
    
    if (code !== 0 && !serverReady) {
      logger.error(`[${appPath}] Process failed to start`);
      // Handle startup failure...
    }
  });

  // Set startup timeout
  startupTimeout = setTimeout(() => {
    if (!serverReady) {
      logger.error(`[${appPath}] Server startup timeout`);
      childProcess.kill('SIGTERM');
    }
  }, 30000); // 30 second timeout
}
```

### 3. Graceful Shutdown

**Process Termination:**
```typescript
async function stopApp(appId: number): Promise<void> {
  const processInfo = processManager.getProcessInfo(appId);
  
  if (!processInfo) {
    logger.debug(`No process found for app ${appId}`);
    return;
  }

  try {
    // Attempt graceful shutdown first
    process.kill(processInfo.pid, 'SIGTERM');

    // Wait for graceful shutdown
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Graceful shutdown timeout'));
      }, 5000);

      const checkProcess = setInterval(() => {
        try {
          process.kill(processInfo.pid, 0); // Check if process exists
        } catch (error) {
          // Process has exited
          clearTimeout(timeout);
          clearInterval(checkProcess);
          resolve();
        }
      }, 100);
    });

  } catch (error) {
    // Force kill if graceful shutdown fails
    logger.warn(`Graceful shutdown failed for app ${appId}, force killing...`);
    try {
      process.kill(processInfo.pid, 'SIGKILL');
    } catch (killError) {
      logger.error(`Failed to force kill process ${processInfo.pid}:`, killError);
    }
  } finally {
    // Clean up resources
    processManager.releasePort(processInfo.port);
    processManager.removeProcess(appId);
  }
}
```

## Package Manager Detection

### 1. Automatic Detection

**Package Manager Detection Logic:**
```typescript
async function detectPackageManager(appPath: string): Promise<'npm' | 'pnpm' | 'yarn'> {
  // Check for lock files in order of preference
  const lockFiles = [
    { file: 'pnpm-lock.yaml', manager: 'pnpm' as const },
    { file: 'yarn.lock', manager: 'yarn' as const },
    { file: 'package-lock.json', manager: 'npm' as const },
  ];

  for (const { file, manager } of lockFiles) {
    if (fs.existsSync(path.join(appPath, file))) {
      return manager;
    }
  }

  // Default to npm if no lock file found
  return 'npm';
}
```

### 2. Command Adaptation

**Package Manager Commands:**
```typescript
function getPackageManagerCommands(manager: string) {
  const commands = {
    npm: {
      install: ['npm', 'install'],
      dev: ['npm', 'run', 'dev'],
      build: ['npm', 'run', 'build'],
      start: ['npm', 'start'],
    },
    pnpm: {
      install: ['pnpm', 'install'],
      dev: ['pnpm', 'dev'],
      build: ['pnpm', 'build'],
      start: ['pnpm', 'start'],
    },
    yarn: {
      install: ['yarn', 'install'],
      dev: ['yarn', 'dev'],
      build: ['yarn', 'build'],
      start: ['yarn', 'start'],
    },
  };

  return commands[manager] || commands.npm;
}
```

## Error Handling & Recovery

### 1. Common Error Scenarios

**Port Conflicts:**
```typescript
function handlePortConflict(appId: number, originalPort: number): Promise<number> {
  return new Promise(async (resolve, reject) => {
    try {
      // Find alternative port
      const newPort = await portManager.getAvailablePort();
      
      // Update process info
      const processInfo = processManager.getProcessInfo(appId);
      if (processInfo) {
        processInfo.port = newPort;
        processInfo.status = 'restarting';
      }

      // Restart with new port
      const newProcess = await startDevServer(processInfo.appPath, newPort);
      
      logger.info(`App ${appId} restarted on port ${newPort} due to port conflict`);
      resolve(newPort);
    } catch (error) {
      reject(error);
    }
  });
}
```

**Dependency Issues:**
```typescript
async function handleMissingDependencies(appPath: string): Promise<void> {
  logger.info(`Installing dependencies for ${appPath}...`);
  
  const packageManager = await detectPackageManager(appPath);
  const commands = getPackageManagerCommands(packageManager);

  return new Promise((resolve, reject) => {
    const installProcess = spawn(commands.install[0], commands.install.slice(1), {
      cwd: appPath,
      stdio: 'pipe',
    });

    installProcess.on('exit', (code) => {
      if (code === 0) {
        logger.info(`Dependencies installed successfully for ${appPath}`);
        resolve();
      } else {
        reject(new Error(`Dependency installation failed with code ${code}`));
      }
    });

    installProcess.on('error', (error) => {
      reject(error);
    });
  });
}
```

### 2. Process Recovery

**Automatic Restart:**
```typescript
async function recoverProcess(appId: number): Promise<boolean> {
  const processInfo = processManager.getProcessInfo(appId);
  
  if (!processInfo) {
    return false;
  }

  try {
    // Stop existing process if still running
    await stopApp(appId);

    // Wait briefly before restart
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Restart the process
    const newProcessInfo = await processManager.startApp(appId, processInfo.appPath);
    
    logger.info(`Successfully recovered app ${appId} on port ${newProcessInfo.port}`);
    return true;
  } catch (error) {
    logger.error(`Failed to recover app ${appId}:`, error);
    return false;
  }
}
```

## Performance Optimization

### 1. Resource Management

**Memory Monitoring:**
```typescript
function monitorProcessResources(processInfo: ProcessInfo): void {
  const pid = processInfo.pid;
  
  const monitor = setInterval(() => {
    try {
      const usage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Log resource usage
      logger.debug(`Process ${pid} - Memory: ${usage.heapUsed / 1024 / 1024}MB, CPU: ${cpuUsage.user + cpuUsage.system}µs`);
      
      // Check for memory leaks or excessive resource usage
      if (usage.heapUsed > 500 * 1024 * 1024) { // 500MB threshold
        logger.warn(`High memory usage detected for process ${pid}`);
      }
    } catch (error) {
      // Process might have exited
      clearInterval(monitor);
    }
  }, 30000); // Check every 30 seconds

  // Clean up monitor when process exits
  const originalExit = process.exit;
  process.exit = (code) => {
    clearInterval(monitor);
    originalExit(code);
  };
}
```

### 2. Process Pooling

**Efficient Resource Usage:**
```typescript
class ProcessPool {
  private maxProcesses = 10;
  private activeProcesses = new Map<number, ProcessInfo>();

  async requestProcess(appId: number, appPath: string): Promise<ProcessInfo> {
    // Check if we're at capacity
    if (this.activeProcesses.size >= this.maxProcesses) {
      // Find least recently used process to terminate
      const lruProcess = this.findLRUProcess();
      if (lruProcess) {
        await this.terminateProcess(lruProcess.appId);
      }
    }

    return await this.startNewProcess(appId, appPath);
  }

  private findLRUProcess(): ProcessInfo | null {
    let oldest: ProcessInfo | null = null;
    let oldestTime = Date.now();

    for (const process of this.activeProcesses.values()) {
      if (process.startTime.getTime() < oldestTime) {
        oldest = process;
        oldestTime = process.startTime.getTime();
      }
    }

    return oldest;
  }
}
```

## Integration with Preview System

### 1. Server-Preview Communication

**Proxy Configuration:**
```typescript
// The preview system connects to development servers via proxy
function createProxyConfig(port: number) {
  return {
    '/api': {
      target: `http://localhost:${port}`,
      changeOrigin: true,
      secure: false,
    },
    '/': {
      target: `http://localhost:${port}`,
      changeOrigin: true,
      secure: false,
      ws: true, // WebSocket support for HMR
    },
  };
}
```

### 2. Hot Module Replacement

**HMR Integration:**
```typescript
function setupHMRProxy(appId: number, port: number): void {
  const wss = new WebSocket.Server({ port: port + 1000 }); // HMR on offset port

  wss.on('connection', (ws) => {
    logger.debug(`HMR WebSocket connected for app ${appId}`);

    // Forward HMR messages from dev server
    const devServerWs = new WebSocket(`ws://localhost:${port}`);
    
    devServerWs.on('message', (data) => {
      ws.send(data);
    });

    ws.on('close', () => {
      devServerWs.close();
    });
  });
}
```

## Related Files

- **Process Manager**: `/src/main/process_manager.ts`
- **App Handlers**: `/src/ipc/handlers/app_handlers.ts`
- **Port Manager**: `/src/main/port_manager.ts`
- **Preview System**: `/src/components/preview_panel/PreviewIframe.tsx`
- **IPC Client**: `/src/ipc/ipc_client.ts`
- **Main Process**: `/src/main/main.ts`