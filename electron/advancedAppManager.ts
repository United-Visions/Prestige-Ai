import { ipcMain, BrowserWindow } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import { Worker } from 'worker_threads';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { startProxy } from './utils/startProxyServer';
import { exec } from 'child_process';
import treeKill from 'tree-kill';

export interface AppOutput {
  message: string;
  type: 'stdout' | 'stderr';
  appId: number;
  timestamp: number;
}

export interface RunningProcess {
  appId: number;
  process: ChildProcess;
  proxyWorker?: Worker;
  startTime: number;
}

export class AdvancedAppManager {
  private static instance: AdvancedAppManager;
  private runningProcesses: Map<number, RunningProcess> = new Map();
  private mainWindow: BrowserWindow | null = null;
  private globalProxyWorker: Worker | null = null;

  private constructor() {
    this.setupIpcHandlers();
  }

  // Helper function to detect available package managers
  private async detectPackageManagers(appId: number): Promise<void> {
    const managers = ['pnpm', 'npm', 'yarn'];
    const available: string[] = [];
    
    for (const manager of managers) {
      try {
        const result = await new Promise<boolean>((resolve) => {
          const child = spawn(manager, ['--version'], { 
            stdio: 'ignore',
            shell: true,
            env: process.env 
          });
          child.on('close', (code) => resolve(code === 0));
          child.on('error', () => resolve(false));
          setTimeout(() => resolve(false), 3000); // 3 second timeout
        });
        
        if (result) {
          available.push(manager);
        }
      } catch (error) {
        // Manager not available
      }
    }
    
    this.sendOutput(appId, {
      message: `Available package managers: ${available.length > 0 ? available.join(', ') : 'none detected'}`,
      type: 'stdout',
      appId,
      timestamp: Date.now()
    });
    
    if (available.length === 0) {
      this.sendOutput(appId, {
        message: `Warning: No package managers detected. Please ensure Node.js and a package manager (npm, pnpm, or yarn) are installed and in your PATH.`,
        type: 'stderr',
        appId,
        timestamp: Date.now()
      });
    }
  }

  // Helper function to recursively remove directories (replaces fs-extra.remove)
  private async removeDirectory(dirPath: string): Promise<void> {
    try {
      await fs.promises.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      // If rm is not available (older Node.js), use rmdir
      try {
        const stats = await fs.promises.stat(dirPath);
        if (stats.isDirectory()) {
          const entries = await fs.promises.readdir(dirPath);
          await Promise.all(entries.map(entry => 
            this.removeDirectory(path.join(dirPath, entry))
          ));
          await fs.promises.rmdir(dirPath);
        } else {
          await fs.promises.unlink(dirPath);
        }
      } catch (fallbackError) {
        throw fallbackError;
      }
    }
  }

  public static getInstance(): AdvancedAppManager {
    if (!AdvancedAppManager.instance) {
      AdvancedAppManager.instance = new AdvancedAppManager();
    }
    return AdvancedAppManager.instance;
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  private setupIpcHandlers() {
    // Run app
    ipcMain.handle('advanced-app:run', async (_event, appId: number, appPath: string) => {
      try {
        return await this.runApp(appId, appPath);
      } catch (error) {
        console.error('Error running app:', error);
        throw error;
      }
    });

    // Stop app
    ipcMain.handle('advanced-app:stop', async (_event, appId: number) => {
      try {
        await this.stopApp(appId);
      } catch (error) {
        console.error('Error stopping app:', error);
        throw error;
      }
    });

    // Restart app
    ipcMain.handle('advanced-app:restart', async (_event, appId: number, appPath: string, removeNodeModules: boolean = false) => {
      try {
        return await this.restartApp(appId, appPath, removeNodeModules);
      } catch (error) {
        console.error('Error restarting app:', error);
        throw error;
      }
    });

    // Check if app is running
    ipcMain.handle('advanced-app:is-running', async (_event, appId: number) => {
      return this.isAppRunning(appId);
    });

    // Get running apps
    ipcMain.handle('advanced-app:get-running', async () => {
      return Array.from(this.runningProcesses.keys());
    });

    // Rebuild app
    ipcMain.handle('advanced-app:rebuild', async (_event, appId: number, appPath: string) => {
      console.log(`[IPC] ===== REBUILD REQUEST RECEIVED =====`);
      console.log(`[IPC] App ID: ${appId}`);
      console.log(`[IPC] App Path: ${appPath}`);
      try {
        console.log(`[IPC] Calling rebuildApp method`);
        const result = await this.rebuildApp(appId, appPath);
        console.log(`[IPC] Rebuild completed successfully`);
        console.log(`[IPC] ===== REBUILD REQUEST END =====`);
        return result;
      } catch (error) {
        console.error('[IPC] ===== REBUILD ERROR =====');
        console.error('[IPC] Error rebuilding app:', error);
        console.error('[IPC] ===== REBUILD ERROR END =====');
        throw error;
      }
    });
  }

  private sendOutput(appId: number, output: AppOutput) {
    console.log(`[OUTPUT] Attempting to send output for app ${appId}: ${output.message}`);
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      try {
        console.log(`[OUTPUT] Window is valid, sending output for app ${appId}`);
        this.mainWindow.webContents.send('advanced-app:output', appId, output);
        console.log(`[OUTPUT] Output sent successfully for app ${appId}`);
      } catch (error) {
        // Window was destroyed between check and send, ignore
        console.warn(`[OUTPUT] Failed to send output for app ${appId}, window destroyed:`, error);
      }
    } else {
      console.warn(`[OUTPUT] Cannot send output for app ${appId}: window is null or destroyed`);
    }
  }


  private async runApp(appId: number, appPath: string): Promise<{ proxyUrl?: string }> {
    // Terminate global proxy worker first (like @dyad does)
    if (this.globalProxyWorker) {
      console.log(`[RUN] Terminating existing global proxy worker before starting app ${appId}`);
      await this.globalProxyWorker.terminate();
      this.globalProxyWorker = null;
    }

    // Stop existing process if running
    await this.stopApp(appId);

    // Kill any orphaned process on port 32100 (like @dyad does)
    console.log(`[RUN] Killing any orphaned processes on port 32100 before starting app ${appId}`);
    await this.killProcessOnPort(32100);

    // Add starting message
    this.sendOutput(appId, {
      message: "Starting app...",
      type: "stdout",
      appId,
      timestamp: Date.now(),
    });

    // Detect available package managers for debugging
    await this.detectPackageManagers(appId);

    // Start the development server with @dyad-style URL detection
    // The proxy will be started automatically when a localhost URL is detected in stdout
    const childProcess = this.spawnDevServer(appPath, appId);
    let proxyUrl: string | undefined;

    // Store running process
    this.runningProcesses.set(appId, {
      appId,
      process: childProcess,
      proxyWorker: this.globalProxyWorker || undefined,
      startTime: Date.now()
    });

    return { proxyUrl };
  }

  private spawnDevServer(appPath: string, appId: number): ChildProcess {
    // The actual web app code is in the 'files' subdirectory
    const filesPath = path.join(appPath, 'files');
    
    // Use CCdyad's exact approach - simple shell command with || fallback
    const command = "(pnpm install && pnpm run dev --port 32100) || (npm install --legacy-peer-deps && npm run dev -- --port 32100)";
    const args: string[] = []; // Empty args array like CCdyad

    // Fix PATH for production - this is critical
    const fixedEnv = { ...process.env };
    if (os.platform() !== 'win32') {
      const standardPaths = ['/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'];
      const homebrewPath = process.arch === 'arm64' ? '/opt/homebrew/bin' : '/usr/local/bin';
      const userPaths = [`${os.homedir()}/.npm-global/bin`, `${os.homedir()}/.local/bin`, `${os.homedir()}/.pnpm`, `${os.homedir()}/.yarn/bin`];
      
      const pathSet = new Set([
        ...standardPaths,
        homebrewPath,
        ...userPaths,
        ...(fixedEnv.PATH ? fixedEnv.PATH.split(':') : [])
      ]);
      
      fixedEnv.PATH = Array.from(pathSet).join(':');
    }
    
    // Log environment details for debugging
    this.sendOutput(appId, {
      message: `Debug: Spawning dev server for app ${appId}...`,
      type: 'stdout',
      appId,
      timestamp: Date.now()
    });

    this.sendOutput(appId, {
      message: `Environment PATH: ${fixedEnv.PATH}`,
      type: 'stdout',
      appId,
      timestamp: Date.now()
    });

    this.sendOutput(appId, {
      message: `Executing command: ${command} ${args.join(' ')}`,
      type: 'stdout',
      appId,
      timestamp: Date.now()
    });

    this.sendOutput(appId, {
      message: `Working directory: ${filesPath}`,
      type: 'stdout',
      appId,
      timestamp: Date.now()
    });

    const childProcess = spawn(command, args, {
      cwd: filesPath,
      shell: true, // Like CCdyad - let shell handle the command
      stdio: 'pipe', // Like CCdyad
      detached: false, // Like CCdyad - attach to main process
      env: fixedEnv
    });

    childProcess.stdout?.on('data', async (data: Buffer) => {
      const message = data.toString();
      console.log(`[APP-${appId}-STDOUT]`, message);
      this.sendOutput(appId, {
        message,
        type: 'stdout',
        appId,
        timestamp: Date.now()
      });

      // @dyad-style URL detection - look for localhost URLs in stdout
      const urlMatch = message.match(/(https?:\/\/localhost:\d+\/?)/);
      if (urlMatch) {
        console.log(`[APP-${appId}] Detected dev server URL: ${urlMatch[1]}`);
        
        // Start proxy when URL is detected (just like @dyad)
        if (!this.globalProxyWorker) {
          try {
            this.globalProxyWorker = await startProxy(urlMatch[1], {
              onStarted: (proxyUrl: string) => {
                this.sendOutput(appId, {
                  message: `[prestige-proxy-server]started=[${proxyUrl}] original=[${urlMatch[1]}]`,
                  type: 'stdout',
                  appId,
                  timestamp: Date.now()
                });
              },
              onMessage: (proxyMessage: string) => {
                this.sendOutput(appId, {
                  message: `[proxy] ${proxyMessage}`,
                  type: 'stdout',
                  appId,
                  timestamp: Date.now()
                });
              }
            });

            // Update the running process with proxy worker
            const runningProcess = this.runningProcesses.get(appId);
            if (runningProcess) {
              runningProcess.proxyWorker = this.globalProxyWorker;
            }
            
            console.log(`[APP-${appId}] Proxy server started successfully for ${urlMatch[1]}`);
          } catch (proxyError) {
            console.error(`[APP-${appId}] Failed to start proxy server:`, proxyError);
            this.sendOutput(appId, {
              message: `Failed to start proxy server: ${proxyError}`,
              type: 'stderr',
              appId,
              timestamp: Date.now()
            });
          }
        }
      }
    });

    childProcess.stderr?.on('data', (data: Buffer) => {
      const message = data.toString();
      console.log(`[APP-${appId}-STDERR]`, message);
      this.sendOutput(appId, {
        message,
        type: 'stderr',
        appId,
        timestamp: Date.now()
      });
    });

    childProcess.on('close', (code: number | null) => {
      this.sendOutput(appId, {
        message: `Dev server exited with code ${code}`,
        type: code === 0 ? 'stdout' : 'stderr',
        appId,
        timestamp: Date.now()
      });
      
      // Clean up any remaining processes on the port when process exits
      this.killProcessOnPort(32100).catch(console.error);
      this.runningProcesses.delete(appId);
    });

    childProcess.on('error', (error: Error) => {
      this.sendOutput(appId, {
        message: `Dev server error: ${error.message}`,
        type: 'stderr',
        appId,
        timestamp: Date.now()
      });
    });

    return childProcess;
  }

  /**
   * Kills a running process with its child processes - based on @dyad's implementation
   * @param process The child process to kill
   * @returns A promise that resolves when the process is closed or timeout
   */
  private async killProcess(process: ChildProcess): Promise<void> {
    return new Promise<void>((resolve) => {
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.warn(
          `Timeout waiting for process (PID: ${process.pid}) to close. Force killing may be needed.`,
        );
        resolve();
      }, 5000); // 5-second timeout

      process.on("close", (code, signal) => {
        clearTimeout(timeout);
        console.log(
          `Received 'close' event for process (PID: ${process.pid}) with code ${code}, signal ${signal}.`,
        );
        resolve();
      });

      // Handle potential errors during kill/close sequence
      process.on("error", (err) => {
        clearTimeout(timeout);
        console.error(
          `Error during stop sequence for process (PID: ${process.pid}): ${err.message}`,
        );
        resolve();
      });

      // Ensure PID exists before attempting to kill
      if (process.pid) {
        // Use tree-kill to terminate the entire process tree
        console.log(
          `Attempting to tree-kill process tree starting at PID ${process.pid}.`,
        );
        treeKill(process.pid, "SIGTERM", (err: Error | undefined) => {
          if (err) {
            console.warn(
              `tree-kill error for PID ${process.pid}: ${err.message}`,
            );
          } else {
            console.log(
              `tree-kill signal sent successfully to PID ${process.pid}.`,
            );
          }
        });
      } else {
        console.warn(`Cannot tree-kill process: PID is undefined.`);
        resolve();
      }
    });
  }

  // Helper to kill process on a specific port (cross-platform) - always kill in all environments
  private async killProcessOnPort(port: number): Promise<void> {
    try {
      if (os.platform() === 'win32') {
        // Windows: find and kill process on port
        await new Promise<void>((resolve) => {
          exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
            if (error || !stdout) {
              resolve();
              return;
            }
            
            const lines = stdout.split('\n');
            const pids = new Set<string>();
            
            for (const line of lines) {
              const parts = line.trim().split(/\s+/);
              if (parts.length >= 5 && parts[1].includes(`:${port}`)) {
                pids.add(parts[4]);
              }
            }
            
            if (pids.size === 0) {
              resolve();
              return;
            }
            
            const killPromises = Array.from(pids).map(pid => 
              new Promise<void>((killResolve) => {
                exec(`taskkill /F /PID ${pid}`, () => killResolve());
              })
            );
            
            Promise.all(killPromises).then(() => resolve());
          });
        });
      } else {
        // Unix: find and kill process on port
        await new Promise<void>((resolve) => {
          exec(`lsof -ti tcp:${port}`, (error, stdout) => {
            if (error || !stdout) {
              resolve();
              return;
            }
            
            const pids = stdout.trim().split('\n').filter(pid => pid);
            
            if (pids.length === 0) {
              resolve();
              return;
            }
            
            const killPromises = pids.map(pid => 
              new Promise<void>((killResolve) => {
                exec(`kill -9 ${pid}`, () => killResolve());
              })
            );
            
            Promise.all(killPromises).then(() => resolve());
          });
        });
      }
    } catch (error) {
      console.warn(`Failed to kill process on port ${port}:`, error);
    }
  }

  private async stopApp(appId: number): Promise<void> {
    console.log(`[STOP] Attempting to stop app ${appId}. Current running apps: ${this.runningProcesses.size}`);
    const runningProcess = this.runningProcesses.get(appId);

    if (!runningProcess) {
      console.log(`[STOP] App ${appId} not found in running apps map. Assuming already stopped.`);
      return;
    }

    const { process: childProcess, proxyWorker } = runningProcess;
    console.log(`[STOP] Found running app ${appId} with PID: ${childProcess.pid}. Attempting to stop.`);

    // Check if the process is already exited or closed
    if (childProcess.exitCode !== null || childProcess.signalCode !== null) {
      console.log(
        `[STOP] Process for app ${appId} (PID: ${childProcess.pid}) already exited (code: ${childProcess.exitCode}, signal: ${childProcess.signalCode}). Cleaning up map.`,
      );
      this.runningProcesses.delete(appId);
      return;
    }

    try {
      // ALWAYS kill port 32100 processes - this was the root issue!
      // Unlike Prestige's original code, we don't skip this in development
      console.log(`[STOP] Killing processes on port 32100 for app ${appId} (all environments)`);
      await this.killProcessOnPort(32100);
      console.log(`[STOP] Port 32100 cleanup completed for app ${appId}`);

      // Use the @dyad-style killProcess utility to stop the process tree
      await this.killProcess(childProcess);

      // Terminate proxy worker if it exists
      if (proxyWorker) {
        console.log(`[STOP] Terminating proxy worker for app ${appId}`);
        await proxyWorker.terminate();
        console.log(`[STOP] Proxy worker terminated for app ${appId}`);
      }

      // Remove from running processes map
      this.runningProcesses.delete(appId);

      console.log(`[STOP] Successfully stopped app ${appId}`);
      this.sendOutput(appId, {
        message: `Successfully stopped app ${appId}`,
        type: 'stdout',
        appId,
        timestamp: Date.now()
      });

    } catch (error: any) {
      console.error(`[STOP] Error stopping app ${appId} (PID: ${childProcess.pid}):`, error);
      
      // Attempt cleanup even if an error occurred during the stop process
      this.runningProcesses.delete(appId);
      
      this.sendOutput(appId, {
        message: `Error stopping app ${appId}: ${error.message}`,
        type: 'stderr',
        appId,
        timestamp: Date.now()
      });
      
      throw new Error(`Failed to stop app ${appId}: ${error.message}`);
    }
  }

  private async restartApp(appId: number, appPath: string, removeNodeModules: boolean = false): Promise<{ proxyUrl?: string }> {
    // Stop current app
    await this.stopApp(appId);

    // If requested, remove node_modules
    if (removeNodeModules) {
      const nodeModulesPath = path.join(appPath, 'files', 'node_modules');
      
      try {
        await this.removeDirectory(nodeModulesPath);
        this.sendOutput(appId, {
          message: 'Removed node_modules directory',
          type: 'stdout',
          appId,
          timestamp: Date.now()
        });
      } catch (error) {
        this.sendOutput(appId, {
          message: `Warning: Failed to remove node_modules: ${error}`,
          type: 'stderr',
          appId,
          timestamp: Date.now()
        });
      }
    }

    // Wait a moment then restart
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return await this.runApp(appId, appPath);
  }

  private async rebuildApp(appId: number, appPath: string): Promise<{ proxyUrl?: string }> {
    console.log(`[REBUILD] Starting rebuild for app ${appId} at path: ${appPath}`);
    
    try {
      console.log(`[REBUILD] Step 1: Stopping current app ${appId}`);
      await this.stopApp(appId);
      console.log(`[REBUILD] Step 1 completed: App ${appId} stopped successfully`);

      // The actual web app code is in the 'files' subdirectory
      const filesPath = path.join(appPath, 'files');
      const nodeModulesPath = path.join(filesPath, 'node_modules');
      console.log(`[REBUILD] Step 2: Targeting files path: ${filesPath}`);
      console.log(`[REBUILD] Step 2: Node modules path: ${nodeModulesPath}`);
    
      console.log(`[REBUILD] Step 3: Attempting to remove node_modules directory`);
      try {
        await this.removeDirectory(nodeModulesPath);
        console.log(`[REBUILD] Step 3 completed: node_modules removed successfully`);
        this.sendOutput(appId, {
          message: 'Removed node_modules directory for rebuild',
          type: 'stdout',
          appId,
          timestamp: Date.now()
        });
      } catch (error) {
        console.warn(`[REBUILD] Step 3 warning: Failed to remove node_modules:`, error);
        this.sendOutput(appId, {
          message: `Warning: Failed to remove node_modules: ${error}`,
          type: 'stderr',
          appId,
          timestamp: Date.now()
        });
      }

      console.log(`[REBUILD] Step 4: Waiting 3 seconds to ensure process termination and file system sync`);
      // Wait longer to ensure:
      // 1. Process is fully terminated
      // 2. File system operations complete  
      // 3. Vite cache is cleared
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log(`[REBUILD] Step 5: Starting app ${appId} again`);
      const result = await this.runApp(appId, appPath);
      console.log(`[REBUILD] Step 5 completed: App ${appId} restarted successfully`);
      console.log(`[REBUILD] Rebuild process completed successfully for app ${appId}`);
      return result;
    } catch (rebuildError) {
      console.error(`[REBUILD] FATAL ERROR during rebuild of app ${appId}:`, rebuildError);
      throw rebuildError;
    }
  }

  isAppRunning(appId: number): boolean {
    return this.runningProcesses.has(appId);
  }

  getRunningApps(): number[] {
    return Array.from(this.runningProcesses.keys());
  }

  // Cleanup on app exit
  cleanup() {
    console.log('[CLEANUP] ===== CLEANUP PROCESS STARTED =====');
    console.log(`[CLEANUP] NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`[CLEANUP] Number of running processes: ${this.runningProcesses.size}`);
    console.log(`[CLEANUP] Running app IDs: ${Array.from(this.runningProcesses.keys()).join(', ')}`);
    
    // Terminate global proxy worker
    if (this.globalProxyWorker) {
      console.log('[CLEANUP] Terminating global proxy worker');
      this.globalProxyWorker.terminate().catch(console.error);
      this.globalProxyWorker = null;
    }
    
    // Stop all running apps gracefully
    const stopPromises = Array.from(this.runningProcesses.keys()).map(appId => {
      console.log(`[CLEANUP] Starting cleanup for app ${appId}`);
      return this.stopApp(appId).catch(error => {
        console.error(`[CLEANUP] Failed to stop app ${appId}:`, error);
      });
    });
    
    // ALWAYS kill processes on port 32100 when shutting down - don't skip in development
    console.log('[CLEANUP] Killing processes on port 32100 (all environments)');
    this.killProcessOnPort(32100).catch(console.error);
    
    console.log('[CLEANUP] Clearing processes map');
    // Clear the processes map
    this.runningProcesses.clear();
    console.log('[CLEANUP] ===== CLEANUP PROCESS COMPLETED =====');
  }
}