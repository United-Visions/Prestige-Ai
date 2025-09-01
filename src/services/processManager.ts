// Browser-compatible process manager
export interface ProcessInfo {
  pid: number;
  port: number;
  appId: number;
  command: string;
  startTime: Date;
  status: 'starting' | 'running' | 'stopped' | 'error';
  lastError?: string;
}

export interface AppOutput {
  message: string;
  type: 'stdout' | 'stderr' | 'system' | 'client-error';
  timestamp: Date;
  appId: number;
}

export class ProcessManager {
  private processes = new Map<number, ProcessInfo>();
  private readonly DEFAULT_PORT = 32100;
  
  // Event handling
  private outputCallbacks: ((output: AppOutput) => void)[] = [];
  
  constructor() {
    console.log('ProcessManager initialized for browser environment');
  }

  onOutput(callback: (output: AppOutput) => void) {
    this.outputCallbacks.push(callback);
  }

  private emitOutput(output: AppOutput) {
    this.outputCallbacks.forEach(callback => callback(output));
  }

  async startApp(appId: number, _appPath: string): Promise<ProcessInfo> {
    // Browser simulation of app starting
    const processInfo: ProcessInfo = {
      pid: Math.floor(Math.random() * 10000),
      port: this.DEFAULT_PORT,
      appId,
      command: 'npm run dev',
      startTime: new Date(),
      status: 'starting'
    };

    this.processes.set(appId, processInfo);

    // Simulate startup process
    this.emitOutput({
      message: `Starting development server for app ${appId}...`,
      type: 'system',
      timestamp: new Date(),
      appId
    });

    // Simulate async startup
    setTimeout(() => {
      processInfo.status = 'running';
      this.emitOutput({
        message: `✓ Development server started on port ${this.DEFAULT_PORT}`,
        type: 'stdout',
        timestamp: new Date(),
        appId
      });
    }, 2000);

    return processInfo;
  }

  async stopApp(appId: number): Promise<void> {
    const processInfo = this.processes.get(appId);
    if (processInfo) {
      processInfo.status = 'stopped';
      this.emitOutput({
        message: `Process stopped for app ${appId}`,
        type: 'system',
        timestamp: new Date(),
        appId
      });
    }
  }

  async restartApp(appId: number, appPath: string): Promise<ProcessInfo> {
    await this.stopApp(appId);
    return this.startApp(appId, appPath);
  }

  async rebuildApp(appId: number, appPath: string): Promise<ProcessInfo> {
    this.emitOutput({
      message: 'Rebuilding application...',
      type: 'system',
      timestamp: new Date(),
      appId
    });
    
    return this.startApp(appId, appPath);
  }

  getProcessInfo(appId: number): ProcessInfo | undefined {
    return this.processes.get(appId);
  }

  getAllProcesses(): ProcessInfo[] {
    return Array.from(this.processes.values());
  }

  isAppRunning(appId: number): boolean {
    const processInfo = this.processes.get(appId);
    return processInfo?.status === 'running' || processInfo?.status === 'starting';
  }
}

// Singleton instance
export const processManager = new ProcessManager();