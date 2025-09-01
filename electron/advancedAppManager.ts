import { ipcMain, BrowserWindow } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import { Worker } from 'worker_threads';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { startProxy } from './utils/startProxyServer';
import { request } from 'http';
import { exec } from 'child_process';

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
    // Stop existing process if running
    await this.stopApp(appId);

    // Add starting message
    this.sendOutput(appId, {
      message: "Starting app...",
      type: "stdout",
      appId,
      timestamp: Date.now(),
    });

    // Detect available package managers for debugging
    await this.detectPackageManagers(appId);

    // Start the development server
    const childProcess = this.spawnDevServer(appPath, appId);
    
    // Start proxy server
    let proxyWorker: Worker | null = null;
    let proxyUrl: string | undefined;
    
    // Wait for dev server to be ready, then start proxy
    const waitForDevServerAndStartProxy = async () => {
      // Wait for dev server to be ready by checking the URL
      let attempts = 0;
      const maxAttempts = 10;
      const targetOrigin = 'http://localhost:32100';
      
      this.sendOutput(appId, {
        message: `Waiting for dev server at ${targetOrigin} to be ready...`,
        type: 'stdout',
        appId,
        timestamp: Date.now()
      });
      
      while (attempts < maxAttempts) {
        try {
          // Use Node.js http module to check if dev server is responding
          const isReady = await new Promise<boolean>((resolve) => {
            const req = request(targetOrigin, { method: 'HEAD', timeout: 1000 }, (res) => {
              resolve(res.statusCode === 200);
            });
            req.on('error', () => resolve(false));
            req.on('timeout', () => resolve(false));
            req.end();
          });
          
          if (isReady) {
            this.sendOutput(appId, {
              message: `Dev server is ready! Starting proxy server...`,
              type: 'stdout',
              appId,
              timestamp: Date.now()
            });
            break;
          }
        } catch (error) {
          // Dev server not ready yet
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between attempts
      }
      
      if (attempts >= maxAttempts) {
        this.sendOutput(appId, {
          message: `Dev server at ${targetOrigin} not responding after ${maxAttempts} attempts, starting proxy anyway...`,
          type: 'stdout',
          appId,
          timestamp: Date.now()
        });
        
        // Log additional debugging information
        this.sendOutput(appId, {
          message: `Upstream error: connect ECONNREFUSED ${targetOrigin} - This usually means the dev server failed to start. Check the logs above for package manager errors.`,
          type: 'stderr',
          appId,
          timestamp: Date.now()
        });
      }

      try {
        this.sendOutput(appId, {
          message: `Starting proxy server for ${targetOrigin}...`,
          type: 'stdout',
          appId,
          timestamp: Date.now()
        });

        proxyWorker = await startProxy(targetOrigin, {
          onStarted: (url: string) => {
            proxyUrl = url;
            this.sendOutput(appId, {
              message: `[prestige-proxy-server]started=[${url}] original=[${targetOrigin}]`,
              type: 'stdout',
              appId,
              timestamp: Date.now()
            });
          },
          onMessage: (message: string) => {
            this.sendOutput(appId, {
              message: `[proxy] ${message}`,
              type: 'stdout',
              appId,
              timestamp: Date.now()
            });
          }
        });

        // Update the running process with proxy worker
        const runningProcess = this.runningProcesses.get(appId);
        if (runningProcess) {
          runningProcess.proxyWorker = proxyWorker;
        }
      } catch (proxyError) {
        console.error('Failed to start proxy server:', proxyError);
        this.sendOutput(appId, {
          message: `Failed to start proxy server: ${proxyError}`,
          type: 'stderr',
          appId,
          timestamp: Date.now()
        });
      }
    };
    
    // Start the proxy server process in the background
    waitForDevServerAndStartProxy();

    // Store running process
    this.runningProcesses.set(appId, {
      appId,
      process: childProcess,
      proxyWorker: proxyWorker || undefined,
      startTime: Date.now()
    });

    return { proxyUrl };
  }

  private spawnDevServer(appPath: string, appId: number): ChildProcess {
    // The actual web app code is in the 'files' subdirectory
    const filesPath = path.join(appPath, 'files');
    
    const command = os.platform() === 'win32' 
      ? 'cmd'
      : '/bin/bash';
    
    // Enhanced package manager fallback with better error handling
    const args = os.platform() === 'win32'
      ? ['/c', 'pnpm install && pnpm run dev --port 32100 --force || npm install --legacy-peer-deps && npm run dev -- --port 32100 --force || yarn install && yarn dev --port 32100']
      : ['-c', 'pnpm install && pnpm run dev --port 32100 --force || npm install --legacy-peer-deps && npm run dev -- --port 32100 --force || yarn install && yarn dev --port 32100'];

    // Enhanced PATH for production - comprehensive package manager paths
    const fixedEnv: Record<string, string> = { ...process.env, NODE_ENV: 'development' };
    if (os.platform() !== 'win32') {
      // Comprehensive Unix paths where package managers might be installed
      const extraPaths = [
        '/usr/local/bin',
        '/opt/homebrew/bin', // Apple Silicon Homebrew
        '/usr/bin',
        '/bin',
        `${os.homedir()}/.npm-global/bin`, // Global npm packages
        `${os.homedir()}/.local/bin`, // User local binaries
        `${os.homedir()}/.pnpm`, // pnpm global bin
        `${os.homedir()}/.yarn/bin`, // Yarn global bin
        '/usr/local/lib/node_modules/.bin', // npm global modules bin
        '/usr/local/share/npm/bin', // Alternative npm location
        '/opt/local/bin', // MacPorts
        '/sw/bin', // Fink
        '/usr/local/node/bin', // Custom node installation
        '/opt/node/bin', // Alternative node location
        `${process.env.HOME}/.nvm/current/bin`, // NVM current version
      ];
      const currentPath = fixedEnv.PATH || '';
      const uniquePaths = [...new Set([...extraPaths, ...currentPath.split(':')])];
      fixedEnv.PATH = uniquePaths.join(':');
    } else {
      // Comprehensive Windows paths for package managers
      const extraPaths = [
        'C:\\Program Files\\nodejs',
        'C:\\Program Files (x86)\\nodejs',
        'C:\\Users\\AppData\\Roaming\\npm',
        `${os.homedir()}\\AppData\\Roaming\\npm`,
        `${os.homedir()}\\AppData\\Local\\npm`,
        `${process.env.LOCALAPPDATA}\\pnpm`,
        `${process.env.APPDATA}\\npm`,
        `${process.env.USERPROFILE}\\AppData\\Roaming\\npm`,
        `${process.env.USERPROFILE}\\.yarn\\bin`,
        'C:\\tools\\nodejs',
        'C:\\nodejs',
      ];
      const currentPath = fixedEnv.PATH || '';
      const uniquePaths = [...new Set([...extraPaths, ...currentPath.split(';')])];
      fixedEnv.PATH = uniquePaths.join(';');
    }

    // Log environment details for debugging
    this.sendOutput(appId, {
      message: `Debug: Calling appService.runApp(${appId})...`,
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

    const childProcess = spawn(command, args, {
      cwd: filesPath,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      detached: os.platform() !== 'win32', // Create a new process group on Unix systems
      env: fixedEnv
    });

    childProcess.stdout?.on('data', (data: Buffer) => {
      const message = data.toString();
      this.sendOutput(appId, {
        message,
        type: 'stdout',
        appId,
        timestamp: Date.now()
      });
    });

    childProcess.stderr?.on('data', (data: Buffer) => {
      const message = data.toString();
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

  private async stopApp(appId: number): Promise<void> {
    console.log(`[STOP] Starting stop process for app ${appId}`);
    const runningProcess = this.runningProcesses.get(appId);
    
    if (runningProcess) {
      console.log(`[STOP] Found running process for app ${appId}, attempting to stop`);
      try {
        console.log(`[STOP] Sending stop message to app ${appId}`);
        this.sendOutput(appId, {
          message: `Stopping app ${appId} and cleaning up processes...`,
          type: 'stdout',
          appId,
          timestamp: Date.now()
        });
        console.log(`[STOP] Stop message sent successfully for app ${appId}`);

        // Only kill processes on port 32100 if we're in production
        // In development, killing port processes can trigger app quit events
        if (process.env.NODE_ENV !== 'development') {
          console.log(`[STOP] Production mode: Killing processes on port 32100 for app ${appId}`);
          await this.killProcessOnPort(32100);
          console.log(`[STOP] Port 32100 cleanup completed for app ${appId}`);
        } else {
          console.log(`[STOP] Development mode: Skipping port 32100 cleanup for app ${appId} to prevent app quit`);
        }

        console.log(`[STOP] Checking if process needs to be killed for app ${appId}`);
        // Kill the dev server process and its children - this is essential for rebuild
        if (runningProcess.process && !runningProcess.process.killed) {
          console.log(`[STOP] Process is still running, attempting to kill for app ${appId}`);
          // Kill the entire process group to ensure child processes are terminated
          const pid = runningProcess.process.pid;
          console.log(`[STOP] Process PID for app ${appId}: ${pid}`);
          
          if (pid) {
            try {
              console.log(`[STOP] Killing process group for PID ${pid}`);
              // On Unix systems, kill the entire process group
              if (os.platform() !== 'win32') {
                process.kill(-pid, 'SIGTERM');
                console.log(`[STOP] Sent SIGTERM to process group -${pid}`);
                
                // Force kill after 2 seconds if still running (reduced from 3s)
                setTimeout(() => {
                  try {
                    console.log(`[STOP] Force killing process group -${pid} with SIGKILL`);
                    process.kill(-pid, 'SIGKILL');
                  } catch (e) {
                    console.log(`[STOP] Process group -${pid} already terminated`);
                  }
                }, 2000);
              } else {
                // On Windows, use taskkill to kill process tree
                console.log(`[STOP] Using taskkill for Windows PID ${pid}`);
                exec(`taskkill /F /T /PID ${pid}`, (error) => {
                  if (error) {
                    console.warn(`[STOP] Failed to kill Windows process tree: ${error}`);
                  } else {
                    console.log(`[STOP] Windows process tree killed for PID ${pid}`);
                  }
                });
              }
            } catch (error) {
              console.warn(`[STOP] Failed to kill process group: ${error}`);
              // Fallback to killing just the main process
              try {
                console.log(`[STOP] Fallback: killing main process with SIGKILL`);
                runningProcess.process.kill('SIGKILL');
              } catch (fallbackError) {
                console.warn(`[STOP] Fallback kill also failed: ${fallbackError}`);
              }
            }
          }
        } else {
          console.log(`[STOP] No process to kill for app ${appId} (already dead or missing)`);
        }

        // Terminate proxy worker
        if (runningProcess.proxyWorker) {
          this.sendOutput(appId, {
            message: `Terminating proxy server...`,
            type: 'stdout',
            appId,
            timestamp: Date.now()
          });
          await runningProcess.proxyWorker.terminate();
          this.sendOutput(appId, {
            message: `Proxy server terminated`,
            type: 'stdout',
            appId,
            timestamp: Date.now()
          });
        }

        // Clean up
        this.runningProcesses.delete(appId);

        this.sendOutput(appId, {
          message: `Successfully stopped app ${appId}`,
          type: 'stdout',
          appId,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error(`Error stopping app ${appId}:`, error);
        this.sendOutput(appId, {
          message: `Error stopping app ${appId}: ${error}`,
          type: 'stderr',
          appId,
          timestamp: Date.now()
        });
        throw error;
      }
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

  private async killProcessOnPort(port: number): Promise<void> {
    return new Promise((resolve) => {
      if (os.platform() === 'win32') {
        // Windows: find and kill process on port
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
          
          let killPromises = Array.from(pids).map(pid => 
            new Promise<void>((resolveKill) => {
              exec(`taskkill /F /PID ${pid}`, () => resolveKill());
            })
          );
          
          Promise.all(killPromises).then(() => resolve());
        });
      } else {
        // Unix: find and kill process on port
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
          
          exec(`kill -TERM ${pids.join(' ')}`, (killError) => {
            // Force kill after 2 seconds if TERM didn't work
            setTimeout(() => {
              exec(`kill -KILL ${pids.join(' ')}`, () => resolve());
            }, 2000);
          });
        });
      }
    });
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
    
    // Stop all running apps gracefully
    const stopPromises = Array.from(this.runningProcesses.keys()).map(appId => {
      console.log(`[CLEANUP] Starting cleanup for app ${appId}`);
      return this.stopApp(appId).catch(error => {
        console.error(`[CLEANUP] Failed to stop app ${appId}:`, error);
      });
    });
    
    // Only kill processes on port 32100 if we're actually shutting down
    // In development, let the processes continue running to avoid disrupting the dev experience
    if (process.env.NODE_ENV !== 'development') {
      console.log('[CLEANUP] Production mode: killing processes on port 32100');
      this.killProcessOnPort(32100).catch(console.error);
    } else {
      console.log('[CLEANUP] Development mode: skipping port 32100 cleanup');
    }
    
    console.log('[CLEANUP] Clearing processes map');
    // Clear the processes map
    this.runningProcesses.clear();
    console.log('[CLEANUP] ===== CLEANUP PROCESS COMPLETED =====');
  }
}