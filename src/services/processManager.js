export class ProcessManager {
    constructor() {
        Object.defineProperty(this, "processes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "DEFAULT_PORT", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 32100
        });
        // Event handling
        Object.defineProperty(this, "outputCallbacks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        console.log('ProcessManager initialized for browser environment');
    }
    onOutput(callback) {
        this.outputCallbacks.push(callback);
    }
    emitOutput(output) {
        this.outputCallbacks.forEach(callback => callback(output));
    }
    async startApp(appId, _appPath) {
        // Browser simulation of app starting
        const processInfo = {
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
    async stopApp(appId) {
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
    async restartApp(appId, appPath) {
        await this.stopApp(appId);
        return this.startApp(appId, appPath);
    }
    async rebuildApp(appId, appPath) {
        this.emitOutput({
            message: 'Rebuilding application...',
            type: 'system',
            timestamp: new Date(),
            appId
        });
        return this.startApp(appId, appPath);
    }
    getProcessInfo(appId) {
        return this.processes.get(appId);
    }
    getAllProcesses() {
        return Array.from(this.processes.values());
    }
    isAppRunning(appId) {
        const processInfo = this.processes.get(appId);
        return processInfo?.status === 'running' || processInfo?.status === 'starting';
    }
}
// Singleton instance
export const processManager = new ProcessManager();
