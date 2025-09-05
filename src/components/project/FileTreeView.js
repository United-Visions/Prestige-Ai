import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronDown, File, Folder, Download, Loader } from 'lucide-react';
import useCodeViewerStore from '@/stores/codeViewerStore';
import { FileSystemService } from '@/services/fileSystemService';
import { resolveAppPaths } from '@/utils/appPathResolver';
import useAppStore from '@/stores/appStore';
function FileItem({ node, depth }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { showCodeViewer } = useCodeViewerStore();
    const { currentApp } = useAppStore();
    const handleToggle = async () => {
        if (node.type === 'directory') {
            setIsExpanded(!isExpanded);
        }
        else {
            // For files, directly open in code viewer
            await handleOpenInViewer();
        }
    };
    const handleOpenInViewer = async () => {
        if (node.type === 'file') {
            if (node.content) {
                // File already has content, show it directly
                showCodeViewer(node);
            }
            else {
                // Load content on demand
                setIsLoading(true);
                try {
                    const fileService = FileSystemService.getInstance();
                    // Build the correct full path: ~/Desktop/prestige-ai/{app-name}/files/{file-path}
                    const { filesPath } = currentApp ? await resolveAppPaths(currentApp) : { filesPath: '' };
                    const fullPath = currentApp ? await window.electronAPI.path.join(filesPath, node.path) : node.path;
                    const content = await fileService.readFile(fullPath);
                    // Create a new node with content
                    const nodeWithContent = {
                        ...node,
                        content: content
                    };
                    showCodeViewer(nodeWithContent);
                }
                catch (error) {
                    console.error('Failed to load file content:', error);
                    // Show empty content as fallback
                    const nodeWithContent = {
                        ...node,
                        content: `// Failed to load content for ${node.name}\n// Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                    };
                    showCodeViewer(nodeWithContent);
                }
                finally {
                    setIsLoading(false);
                }
            }
        }
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 px-2 py-1 hover:bg-accent rounded cursor-pointer", style: { paddingLeft: `${depth * 16 + 8}px` }, onClick: handleToggle, children: [node.type === 'directory' ? (_jsxs(_Fragment, { children: [isExpanded ? (_jsx(ChevronDown, { className: "w-4 h-4" })) : (_jsx(ChevronRight, { className: "w-4 h-4" })), _jsx(Folder, { className: "w-4 h-4 text-blue-500" })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "w-4" }), _jsx(File, { className: "w-4 h-4 text-gray-500" })] })), _jsx("span", { className: "flex-1 text-sm", children: node.name }), node.type === 'file' && isLoading && (_jsx(Loader, { className: "w-3 h-3 animate-spin text-gray-400" }))] }), node.type === 'directory' && isExpanded && node.children && (_jsx("div", { children: node.children.map((child) => (_jsx(FileItem, { node: child, depth: depth + 1 }, child.path))) }))] }));
}
export function FileTreeView({ files }) {
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
    const flattenFiles = (nodes) => {
        const result = [];
        for (const node of nodes) {
            result.push(node);
            if (node.children) {
                result.push(...flattenFiles(node.children));
            }
        }
        return result;
    };
    if (files.length === 0) {
        return (_jsxs("div", { className: "p-4 text-center text-muted-foreground", children: [_jsx(Folder, { className: "w-8 h-8 mx-auto mb-2 opacity-50" }), _jsx("p", { className: "text-sm", children: "No files generated yet" }), _jsx("p", { className: "text-xs", children: "Start chatting to create project files" })] }));
    }
    return (_jsxs("div", { className: "p-2", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("span", { className: "text-sm font-medium", children: ["Files (", files.length, ")"] }), _jsxs(Button, { variant: "ghost", size: "sm", onClick: handleDownloadAll, className: "h-6 text-xs", children: [_jsx(Download, { className: "w-3 h-3 mr-1" }), "All"] })] }), _jsx("div", { className: "space-y-1", children: files.map((file) => (_jsx(FileItem, { node: file, depth: 0 }, file.path))) })] }));
}
