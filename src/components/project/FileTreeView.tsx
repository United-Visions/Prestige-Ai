import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { FileNode } from '@/types';
import { ChevronRight, ChevronDown, File, Folder, Download, Loader } from 'lucide-react';
import useCodeViewerStore from '@/stores/codeViewerStore';
import { FileSystemService } from '@/services/fileSystemService';
import { resolveAppPaths } from '@/utils/appPathResolver';
import useAppStore from '@/stores/appStore';

interface FileTreeViewProps {
  files: FileNode[];
}

interface FileItemProps {
  node: FileNode;
  depth: number;
}

function FileItem({ node, depth }: FileItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showCodeViewer } = useCodeViewerStore();
  const { currentApp } = useAppStore();

  const handleToggle = async () => {
    if (node.type === 'directory') {
      setIsExpanded(!isExpanded);
    } else {
      // For files, directly open in code viewer
      await handleOpenInViewer();
    }
  };

  const handleOpenInViewer = async () => {
    if (node.type === 'file') {
      if (node.content) {
        // File already has content, show it directly
        showCodeViewer(node);
      } else {
        // Load content on demand
        setIsLoading(true);
        try {
          const fileService = FileSystemService.getInstance();
          // Build the correct full path: ~/Desktop/prestige-ai/{app-name}/files/{file-path}
          const { filesPath } = currentApp ? await resolveAppPaths(currentApp) : { filesPath: '' };
          const fullPath = currentApp ? await window.electronAPI.path.join(filesPath, node.path) : node.path;
          const content = await fileService.readFile(fullPath);
          
          // Create a new node with content
          const nodeWithContent: FileNode = {
            ...node,
            content: content
          };
          
          showCodeViewer(nodeWithContent);
        } catch (error) {
          console.error('Failed to load file content:', error);
          // Show empty content as fallback
          const nodeWithContent: FileNode = {
            ...node,
            content: `// Failed to load content for ${node.name}\n// Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
          showCodeViewer(nodeWithContent);
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  return (
    <div>
      <div
        className="flex items-center gap-2 px-2 py-1 hover:bg-accent rounded cursor-pointer"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleToggle}
      >
        {node.type === 'directory' ? (
          <>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <Folder className="w-4 h-4 text-blue-500" />
          </>
        ) : (
          <>
            <div className="w-4" />
            <File className="w-4 h-4 text-gray-500" />
          </>
        )}
        
        <span className="flex-1 text-sm">{node.name}</span>
        
        {node.type === 'file' && isLoading && (
          <Loader className="w-3 h-3 animate-spin text-gray-400" />
        )}
      </div>

      {node.type === 'directory' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileItem key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTreeView({ files }: FileTreeViewProps) {
  const handleDownloadAll = () => {
    // Create a zip-like structure (simplified)
    const allFiles = flattenFiles(files);
    const content = allFiles
      .filter(f => f.type === 'file' && f.content)
      .map(f => `// ${f.path}\n${f.content}\n\n`)
      .join('');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project-files.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const flattenFiles = (nodes: FileNode[]): FileNode[] => {
    const result: FileNode[] = [];
    for (const node of nodes) {
      result.push(node);
      if (node.children) {
        result.push(...flattenFiles(node.children));
      }
    }
    return result;
  };

  if (files.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No files generated yet</p>
        <p className="text-xs">Start chatting to create project files</p>
      </div>
    );
  }

  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Files ({files.length})</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownloadAll}
          className="h-6 text-xs"
        >
          <Download className="w-3 h-3 mr-1" />
          All
        </Button>
      </div>
      
      <div className="space-y-1">
        {files.map((file) => (
          <FileItem key={file.path} node={file} depth={0} />
        ))}
      </div>
    </div>
  );
}