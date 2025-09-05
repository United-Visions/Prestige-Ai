// Path utilities for cross-platform compatibility
const joinPath = (...paths) => {
    return paths.join('/').replace(/\/+/g, '/');
};
export class FileSystemService {
    constructor() {
        Object.defineProperty(this, "isElectron", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        this.isElectron = typeof window !== 'undefined' && window.electronAPI;
    }
    static getInstance() {
        if (!FileSystemService.instance) {
            FileSystemService.instance = new FileSystemService();
        }
        return FileSystemService.instance;
    }
    async getDesktopPath() {
        if (this.isElectron) {
            // Use Electron API to get desktop path
            return await window.electronAPI.app.getDesktopPath();
        }
        else {
            // Fallback for web development
            return '/Users/' + (process.env.USER || 'user') + '/Desktop';
        }
    }
    async getPrestigeAIPath() {
        const desktopPath = await this.getDesktopPath();
        return joinPath(desktopPath, 'prestige-ai');
    }
    async createPrestigeAIDirectory() {
        const prestigePath = await this.getPrestigeAIPath();
        if (this.isElectron) {
            await window.electronAPI.fs.createProjectDir(prestigePath);
        }
        else {
            // In web mode, we can't actually create directories
            console.log('Would create directory:', prestigePath);
        }
        return prestigePath;
    }
    async createAppDirectory(appName) {
        const prestigePath = await this.getPrestigeAIPath();
        const appPath = joinPath(prestigePath, appName);
        if (this.isElectron) {
            await window.electronAPI.fs.createProjectDir(appPath);
            // Create subdirectories
            const subdirs = ['conversations', 'files'];
            for (const subdir of subdirs) {
                await window.electronAPI.fs.createProjectDir(joinPath(appPath, subdir));
            }
        }
        else {
            // Store in virtual file system for web mode
            const virtualPaths = this.getVirtualPaths();
            virtualPaths[appPath] = { type: 'directory', created: new Date() };
            virtualPaths[joinPath(appPath, 'conversations')] = { type: 'directory', created: new Date() };
            virtualPaths[joinPath(appPath, 'files')] = { type: 'directory', created: new Date() };
            localStorage.setItem('prestige-ai-paths', JSON.stringify(virtualPaths));
        }
        return appPath;
    }
    async generateAppNameFromPrompt(userPrompt) {
        // Extract potential app name from user prompt
        const prompt = userPrompt.toLowerCase();
        // Look for common patterns
        let appName = '';
        if (prompt.includes('todo') || prompt.includes('task')) {
            appName = 'todo-app';
        }
        else if (prompt.includes('blog') || prompt.includes('cms')) {
            appName = 'blog-cms';
        }
        else if (prompt.includes('chat') || prompt.includes('messaging')) {
            appName = 'chat-app';
        }
        else if (prompt.includes('e-commerce') || prompt.includes('shop')) {
            appName = 'ecommerce-store';
        }
        else if (prompt.includes('dashboard') || prompt.includes('admin')) {
            appName = 'admin-dashboard';
        }
        else if (prompt.includes('portfolio') || prompt.includes('resume')) {
            appName = 'portfolio-site';
        }
        else if (prompt.includes('api') || prompt.includes('backend')) {
            appName = 'api-server';
        }
        else if (prompt.includes('landing') || prompt.includes('website')) {
            appName = 'landing-page';
        }
        else {
            // Extract first few meaningful words
            const words = prompt
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(word => word.length > 2 && !['the', 'and', 'for', 'with', 'create', 'make', 'build'].includes(word))
                .slice(0, 2);
            appName = words.length > 0 ? words.join('-') + '-app' : 'custom-app';
        }
        // Ensure unique name
        const timestamp = Date.now().toString().slice(-4);
        return `${appName}-${timestamp}`;
    }
    async generateConversationTitle(userMessage) {
        // Generate a meaningful title from the user's first message
        const message = userMessage.trim();
        if (message.length <= 50) {
            return message;
        }
        // Extract key phrases or first sentence
        const firstSentence = message.split(/[.!?]/)[0];
        if (firstSentence.length <= 50) {
            return firstSentence;
        }
        // Truncate and add ellipsis
        return message.substring(0, 47) + '...';
    }
    async writeFile(filePath, content) {
        if (this.isElectron) {
            await window.electronAPI.fs.writeFile(filePath, content);
        }
        else {
            // In web mode, store in localStorage
            const files = this.getVirtualFiles();
            files[filePath] = content;
            localStorage.setItem('prestige-ai-files', JSON.stringify(files));
        }
    }
    async readFile(filePath) {
        if (this.isElectron) {
            return await window.electronAPI.fs.readFile(filePath);
        }
        else {
            // In web mode, read from localStorage
            const files = this.getVirtualFiles();
            return files[filePath] || '';
        }
    }
    async writeProjectFiles(appPath, files) {
        for (const file of files) {
            await this.writeFileNode(appPath, file);
        }
    }
    async writeFileNode(basePath, node) {
        const fullPath = joinPath(basePath, node.path);
        if (node.type === 'directory') {
            if (this.isElectron) {
                await window.electronAPI.fs.createProjectDir(fullPath);
            }
            // Recursively write children
            if (node.children) {
                for (const child of node.children) {
                    await this.writeFileNode(basePath, child);
                }
            }
        }
        else if (node.type === 'file' && node.content) {
            await this.writeFile(fullPath, node.content);
        }
    }
    async saveProject(project) {
        try {
            // Create app directory on desktop
            await this.createPrestigeAIDirectory();
            const appPath = await this.createAppDirectory(project.name);
            // Write all project files to the app directory
            await this.writeProjectFiles(appPath, project.files);
            // The AppManagementService will handle creating the app record.
            // Create project metadata file
            const metadata = {
                id: project.id,
                name: project.name,
                description: project.description,
                createdAt: project.createdAt,
                updatedAt: new Date(),
            };
            const metadataPath = joinPath(appPath, '.prestige-ai.json');
            await this.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
            console.log(`✅ Project saved to: ${appPath}`);
            return appPath;
        }
        catch (error) {
            console.error('Failed to save project:', error);
            throw new Error(`Failed to save project: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    getVirtualFiles() {
        try {
            const stored = localStorage.getItem('prestige-ai-files');
            return stored ? JSON.parse(stored) : {};
        }
        catch {
            return {};
        }
    }
    getVirtualPaths() {
        try {
            const stored = localStorage.getItem('prestige-ai-paths');
            return stored ? JSON.parse(stored) : {};
        }
        catch {
            return {};
        }
    }
    async getAppDirectoryTree(appName) {
        try {
            const prestigePath = await this.getPrestigeAIPath();
            const appPath = joinPath(prestigePath, appName);
            // Read from the 'files' subdirectory where the actual project files are stored
            const filesPath = joinPath(appPath, 'files');
            if (this.isElectron) {
                const tree = await window.electronAPI.fs.readDirectoryTree(filesPath);
                return this.convertTreeToFileNodes(tree);
            }
            else {
                // In web mode, return empty array or mock data
                return [];
            }
        }
        catch (error) {
            console.error('Failed to read app directory tree:', error);
            return [];
        }
    }
    convertTreeToFileNodes(tree) {
        return tree.map(item => {
            const node = {
                name: item.name,
                path: item.path,
                type: item.type
            };
            if (item.type === 'directory' && item.children) {
                node.children = this.convertTreeToFileNodes(item.children);
            }
            return node;
        });
    }
    async getAppPath(appName) {
        const prestigePath = await this.getPrestigeAIPath();
        return joinPath(prestigePath, appName);
    }
    async deleteDirectory(dirPath) {
        if (this.isElectron) {
            await window.electronAPI.fs.deleteDirectory(dirPath);
        }
        else {
            // In web mode, remove from virtual storage
            const files = this.getVirtualFiles();
            const paths = this.getVirtualPaths();
            // Remove all files that start with the directory path
            Object.keys(files).forEach(filePath => {
                if (filePath.startsWith(dirPath)) {
                    delete files[filePath];
                }
            });
            // Remove directory from paths
            delete paths[dirPath];
            localStorage.setItem('prestige-ai-files', JSON.stringify(files));
            localStorage.setItem('prestige-ai-paths', JSON.stringify(paths));
        }
    }
    async exportProjectAsZip(project) {
        // For web environments, create a text bundle
        const files = [];
        const processNode = (node, path = '') => {
            const fullPath = path ? `${path}/${node.name}` : node.name;
            if (node.type === 'file' && node.content) {
                files.push(`// File: ${fullPath}`);
                files.push(node.content);
                files.push(''); // Empty line separator
            }
            if (node.children) {
                node.children.forEach(child => processNode(child, fullPath));
            }
        };
        project.files.forEach(file => processNode(file));
        const content = files.join('\n');
        return new Blob([content], { type: 'text/plain' });
    }
}
