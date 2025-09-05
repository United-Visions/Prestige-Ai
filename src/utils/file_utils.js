// Browser-safe file utilities
export function createFileNode(name, path, type, content, children) {
    const node = { name, path, type };
    if (content !== undefined)
        node.content = content;
    if (children !== undefined)
        node.children = children;
    return node;
}
export function findFileInTree(tree, targetPath) {
    for (const node of tree) {
        if (node.path === targetPath) {
            return node;
        }
        if (node.type === 'directory' && node.children) {
            const found = findFileInTree(node.children, targetPath);
            if (found)
                return found;
        }
    }
    return null;
}
export function flattenFileTree(tree) {
    const flattened = [];
    function flatten(nodes) {
        for (const node of nodes) {
            flattened.push(node);
            if (node.type === 'directory' && node.children) {
                flatten(node.children);
            }
        }
    }
    flatten(tree);
    return flattened;
}
export function getFileExtension(filename) {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot + 1) : '';
}
export function isTextFile(filename) {
    const textExtensions = [
        'txt', 'md', 'js', 'ts', 'jsx', 'tsx', 'json', 'html', 'css', 'scss',
        'less', 'vue', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'php',
        'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'sh', 'yml', 'yaml', 'xml',
        'svg', 'gitignore', 'env', 'config', 'conf', 'ini'
    ];
    const ext = getFileExtension(filename).toLowerCase();
    return textExtensions.includes(ext);
}
// Browser-safe directory copy function (stub for Electron environments)
export async function copyDirectoryRecursive(source, target) {
    // In browser environment, this would need to use the file system API or Electron IPC
    if (typeof window !== 'undefined' && window.electronAPI) {
        await window.electronAPI.fs.copy(source, target, { recursive: true });
    }
    else {
        console.warn('copyDirectoryRecursive called in browser environment');
    }
}
