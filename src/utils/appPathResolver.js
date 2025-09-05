// Central utility to resolve absolute app and files paths.
// Handles cases where app.path is stored as just the app name (relative) vs already absolute.
// Returns both the app root path and the files directory path.
export async function resolveAppPaths(app) {
    if (typeof window === 'undefined' || !window.electronAPI) {
        // Best-effort fallback in non-electron context
        const desktop = '/Users/' + (process.env.USER || 'user') + '/Desktop';
        const prestigeRoot = `${desktop}/prestige-ai`;
        const appRoot = app.path.includes('prestige-ai') ? app.path : `${prestigeRoot}/${app.path}`;
        return { appRoot, filesPath: `${appRoot}/files` };
    }
    const desktopPath = await window.electronAPI.app.getDesktopPath();
    const prestigeRoot = await window.electronAPI.path.join(desktopPath, 'prestige-ai');
    let appRoot = app.path;
    if (!appRoot.includes('prestige-ai')) {
        appRoot = await window.electronAPI.path.join(prestigeRoot, app.path);
    }
    const filesPath = await window.electronAPI.path.join(appRoot, 'files');
    return { appRoot, filesPath };
}
export async function resolveFilesPath(app) {
    const { filesPath } = await resolveAppPaths(app);
    return filesPath;
}
