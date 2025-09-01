// Browser-safe file utilities

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  content?: string;
  children?: FileNode[];
}

export function createFileNode(
  name: string,
  path: string,
  type: 'file' | 'directory',
  content?: string,
  children?: FileNode[]
): FileNode {
  const node: FileNode = { name, path, type };
  if (content !== undefined) node.content = content;
  if (children !== undefined) node.children = children;
  return node;
}

export function findFileInTree(tree: FileNode[], targetPath: string): FileNode | null {
  for (const node of tree) {
    if (node.path === targetPath) {
      return node;
    }
    
    if (node.type === 'directory' && node.children) {
      const found = findFileInTree(node.children, targetPath);
      if (found) return found;
    }
  }
  
  return null;
}

export function flattenFileTree(tree: FileNode[]): FileNode[] {
  const flattened: FileNode[] = [];
  
  function flatten(nodes: FileNode[]): void {
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

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(lastDot + 1) : '';
}

export function isTextFile(filename: string): boolean {
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
export async function copyDirectoryRecursive(source: string, target: string): Promise<void> {
  // In browser environment, this would need to use the file system API or Electron IPC
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    await (window as any).electronAPI.fs.copy(source, target, { recursive: true });
  } else {
    console.warn('copyDirectoryRecursive called in browser environment');
  }
}