import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { FileNode } from '@/types';
import { ChevronRight, ChevronDown, File, Folder, Download, Loader, Plus, Minus, X } from 'lucide-react';
import useCodeViewerStore from '@/stores/codeViewerStore';
import { FileSystemService } from '@/services/fileSystemService';
import { resolveAppPaths } from '@/utils/appPathResolver';
import useAppStore from '@/stores/appStore';
import { GitStatusService, type GitStatus, type GitFileStatus } from '@/services/gitStatusService';

interface FileTreeViewProps {
  files: FileNode[];
}

interface FileItemProps {
  node: FileNode;
  depth: number;
  gitStatusMap: Map<string, GitFileStatus>;
}

function FileItem({ node, depth, gitStatusMap }: FileItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showCodeViewer } = useCodeViewerStore();
  const { currentApp } = useAppStore();
  const gitStatus = gitStatusMap.get(node.path);

  const getGitStatusIcon = (status?: GitFileStatus['status']) => {
    if (!status) return null;
    
    switch (status) {
      case 'modified':
        return <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>;
      case 'added':
      case 'untracked':
        return <Plus className="w-3 h-3 text-green-500" />;
      case 'deleted':
        return <Minus className="w-3 h-3 text-red-500" />;
      case 'staged':
        return <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>;
      default:
        return null;
    }
  };

  const getGitStatusColor = (status?: GitFileStatus['status']) => {
    if (!status) return '';
    
    switch (status) {
      case 'modified':
        return 'text-yellow-600';
      case 'added':
      case 'untracked':
        return 'text-green-600';
      case 'deleted':
        return 'text-red-600 line-through';
      case 'staged':
        return 'text-green-700';
      default:
        return '';
    }
  };

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
        className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
          node.type === 'file' 
            ? 'hover:bg-gradient-to-r hover:from-prestige-primary/10 hover:to-prestige-secondary/10 hover:shadow-sm' 
            : 'hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-cyan-500/10'
        }`}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
        onClick={handleToggle}
      >
        {node.type === 'directory' ? (
          <>
            <div className="flex items-center justify-center w-4 h-4">
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-blue-600 transition-transform duration-200" />
              ) : (
                <ChevronRight className="w-3 h-3 text-blue-600 transition-transform duration-200" />
              )}
            </div>
            <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <Folder className="w-2.5 h-2.5 text-white" />
            </div>
          </>
        ) : (
          <>
            <div className="w-4" />
            <div className="w-4 h-4 rounded bg-gradient-to-br from-prestige-primary/20 to-prestige-secondary/20 flex items-center justify-center border border-prestige-primary/30">
              <File className="w-2.5 h-2.5 text-prestige-primary" />
            </div>
          </>
        )}
        
        <span className={`flex-1 text-sm font-medium transition-colors duration-200 ${
          node.type === 'file' 
            ? gitStatus?.status ? getGitStatusColor(gitStatus.status) : 'text-gray-700 group-hover:text-prestige-primary'
            : 'text-gray-800 group-hover:text-blue-700'
        }`}>
          {node.name}
        </span>
        
        {node.type === 'file' && isLoading && (
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-prestige-primary/20 to-prestige-secondary/20 flex items-center justify-center">
            <Loader className="w-2.5 h-2.5 animate-spin text-prestige-primary" />
          </div>
        )}
        
        {node.type === 'file' && !isLoading && (
          <div className="flex items-center gap-1">
            {gitStatus?.status && (
              <div className="w-4 h-4 flex items-center justify-center">
                {getGitStatusIcon(gitStatus.status)}
              </div>
            )}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-prestige-primary to-prestige-secondary"></div>
            </div>
          </div>
        )}
      </div>

      {node.type === 'directory' && isExpanded && node.children && (
        <div className="ml-2 border-l border-gray-200/50 pl-2">
          {node.children.map((child) => (
            <FileItem key={child.path} node={child} depth={depth + 1} gitStatusMap={gitStatusMap} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTreeView({ files }: FileTreeViewProps) {
  const { currentApp } = useAppStore();
  const [gitStatusMap, setGitStatusMap] = useState<Map<string, GitFileStatus>>(new Map());
  const gitService = GitStatusService.getInstance();

  useEffect(() => {
    const loadGitStatus = async () => {
      if (!currentApp?.path) return;
      
      try {
        const gitStatus = await gitService.getStatus(currentApp.path);
        const statusMap = new Map<string, GitFileStatus>();
        
        gitStatus.files.forEach(file => {
          statusMap.set(file.path, file);
        });
        
        setGitStatusMap(statusMap);
      } catch (error) {
        console.error('Failed to load git status for file tree:', error);
      }
    };

    if (currentApp?.path) {
      loadGitStatus();
      
      // Set up watcher for git status changes
      gitService.startWatching(currentApp.path, (status) => {
        const statusMap = new Map<string, GitFileStatus>();
        status.files.forEach(file => {
          statusMap.set(file.path, file);
        });
        setGitStatusMap(statusMap);
      });
      
      return () => {
        gitService.stopWatching(currentApp.path);
      };
    }
  }, [currentApp]);
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
      <div className="p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-prestige-primary/10 to-prestige-secondary/10 flex items-center justify-center border border-prestige-primary/20">
          <Folder className="w-8 h-8 text-prestige-primary/60" />
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">No files generated yet</p>
        <p className="text-xs text-gray-500">Start chatting to create project files</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200/50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-prestige-primary/20 to-prestige-secondary/20 flex items-center justify-center">
            <Folder className="w-2.5 h-2.5 text-prestige-primary" />
          </div>
          <span className="text-sm font-semibold text-gray-800">
            Files <span className="text-xs font-normal text-gray-500">({files.length})</span>
          </span>
        </div>
        <Button
          variant="premium"
          size="sm"
          onClick={handleDownloadAll}
          className="h-7 px-3 text-xs rounded-lg bg-gradient-to-r from-prestige-primary/10 to-prestige-secondary/10 hover:from-prestige-primary/20 hover:to-prestige-secondary/20 text-prestige-primary border border-prestige-primary/30"
        >
          <Download className="w-3 h-3 mr-1.5" />
          Download All
        </Button>
      </div>
      
      <div className="space-y-0.5">
        {files.map((file) => (
          <FileItem key={file.path} node={file} depth={0} gitStatusMap={gitStatusMap} />
        ))}
      </div>
    </div>
  );
}