import { ipcMain, BrowserWindow } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import { Worker } from 'worker_threads';
import path from 'path';
import os from 'os';
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
      try {
        return await this.rebuildApp(appId, appPath);
      } catch (error) {
        console.error('Error rebuilding app:', error);
        throw error;
      }
    });
  }

  private sendOutput(appId: number, output: AppOutput) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('advanced-app:output', appId, output);
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
    
    const args = os.platform() === 'win32'
      ? ['/c', '(pnpm install && pnpm run dev --port 32100) || (npm install --legacy-peer-deps && npm run dev -- --port 32100)']
      : ['-c', '"(pnpm install && pnpm run dev --port 32100) || (npm install --legacy-peer-deps && npm run dev -- --port 32100)"'];

    const childProcess = spawn(command, args, {
      cwd: filesPath,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      detached: os.platform() !== 'win32', // Create a new process group on Unix systems
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
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
    const runningProcess = this.runningProcesses.get(appId);
    
    if (runningProcess) {
      try {
        this.sendOutput(appId, {
          message: `Stopping app ${appId} and cleaning up processes...`,
          type: 'stdout',
          appId,
          timestamp: Date.now()
        });

        // Kill all processes on port 32100 first
        await this.killProcessOnPort(32100);

        // Kill the dev server process and its children
        if (runningProcess.process && !runningProcess.process.killed) {
          // Kill the entire process group to ensure child processes are terminated
          const pid = runningProcess.process.pid;
          
          if (pid) {
            try {
              // On Unix systems, kill the entire process group
              if (os.platform() !== 'win32') {
                process.kill(-pid, 'SIGTERM');
                
                // Force kill after 3 seconds if still running
                setTimeout(() => {
                  try {
                    process.kill(-pid, 'SIGKILL');
                  } catch (e) {
                    // Process already killed
                  }
                }, 3000);
              } else {
                // On Windows, use taskkill to kill process tree
                exec(`taskkill /F /T /PID ${pid}`, (error) => {
                  if (error) {
                    console.warn(`Failed to kill Windows process tree: ${error}`);
                  }
                });
              }
            } catch (error) {
              console.warn(`Failed to kill process group: ${error}`);
              // Fallback to killing just the main process
              runningProcess.process.kill('SIGKILL');
            }
          }
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
      const nodeModulesPath = path.join(appPath, 'node_modules');
      
      try {
        const fs = require('fs-extra');
        await fs.remove(nodeModulesPath);
        this.sendOutput(appId, {
          message: 'Removed node_modules directory',
          type: 'stdout',
          appId,
          timestamp: Date.now()
        });
      } catch (error) {
        console.warn('Failed to remove node_modules:', error);
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
    // Stop current app
    await this.stopApp(appId);

    // The actual web app code is in the 'files' subdirectory
    const filesPath = path.join(appPath, 'files');
    const nodeModulesPath = path.join(filesPath, 'node_modules');
    
    try {
      const fs = require('fs-extra');
      await fs.remove(nodeModulesPath);
      this.sendOutput(appId, {
        message: 'Removed node_modules directory for rebuild',
        type: 'stdout',
        appId,
        timestamp: Date.now()
      });
    } catch (error) {
      console.warn('Failed to remove node_modules during rebuild:', error);
      this.sendOutput(appId, {
        message: `Warning: Failed to remove node_modules: ${error}`,
        type: 'stderr',
        appId,
        timestamp: Date.now()
      });
    }

    // Wait a moment then restart
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return await this.runApp(appId, appPath);
  }

  isAppRunning(appId: number): boolean {
    return this.runningProcesses.has(appId);
  }

  getRunningApps(): number[] {
    return Array.from(this.runningProcesses.keys());
  }

  // Cleanup on app exit
  cleanup() {
    console.log('Cleaning up all running processes...');
    
    // Stop all running apps
    const stopPromises = Array.from(this.runningProcesses.keys()).map(appId => 
      this.stopApp(appId).catch(console.error)
    );
    
    // Also kill any remaining processes on port 32100
    this.killProcessOnPort(32100).catch(console.error);
    
    // Clear the processes map
    this.runningProcesses.clear();
  }
}