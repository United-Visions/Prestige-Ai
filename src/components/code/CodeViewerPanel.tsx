import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import useCodeViewerStore from '@/stores/codeViewerStore';
import useAppStore from '@/stores/appStore';
import { X, Copy, Download, ChevronDown, ChevronUp, Code2, Play, RotateCcw, Square, RefreshCw, Terminal, Hammer, AlertTriangle, Folder, Edit3, Save, XCircle, Wand2, FileCode, Wrench, MessageCircle, GitBranch, GitCommit, History, Plus } from 'lucide-react';
import { showToast } from '@/utils/toast';
import { FileTreeView } from '@/components/project/FileTreeView';
import { SourceControlPanel } from '@/components/source-control/SourceControlPanel';
import { DiffViewer } from '@/components/diff/DiffViewer';
import { AppError, AppOutput } from '@/types/appTypes';
import { useAiderStore } from '@/stores/aiderStore';
import { GitStatusService } from '@/services/gitStatusService';

interface CodeViewerPanelProps {
  className?: string;
}

export function CodeViewerPanel({ className = '' }: CodeViewerPanelProps) {
  const {
    isVisible,
    selectedFile,
    hideCodeViewer,
    activeTab: storeActiveTab,
    setActiveTab,
    showFileTree,
    setShowFileTree,
    setShowPreviewInChat
  } = useCodeViewerStore();

  const [showSourceControl, setShowSourceControl] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [fileDiff, setFileDiff] = useState<string>('');

  const { currentApp, selectedModel, currentConversation } = useAppStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const activeTab = storeActiveTab;
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectionText, setSelectionText] = useState('');
  const [selectionToolbarPos, setSelectionToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const aiderStore = useAiderStore();
  const gitService = GitStatusService.getInstance();


  useEffect(() => {
    // Reset expansion state when a new file is selected
    if (selectedFile) {
      setIsExpanded(false);
      loadFileDiff();
    }
  }, [selectedFile]);

  const loadFileDiff = async () => {
    if (!selectedFile || !currentApp?.path) {
      setFileDiff('');
      setShowDiff(false);
      return;
    }

    try {
      // Get git status to check if file is modified
      const gitStatus = await gitService.getStatus(currentApp.path);
      const fileStatus = gitStatus.files.find(f => f.path === selectedFile.path);
      
      if (fileStatus && (fileStatus.status === 'modified' || fileStatus.status === 'staged')) {
        // Load diff for modified file
        const diff = await gitService.getDiff(currentApp.path, selectedFile.path, fileStatus.status === 'staged');
        setFileDiff(diff);
        setShowDiff(true);
      } else {
        setFileDiff('');
        setShowDiff(false);
      }
    } catch (error) {
      console.error('Failed to load file diff:', error);
      setFileDiff('');
      setShowDiff(false);
    }
  };

  // Debug log to track file tree state
  useEffect(() => {
    console.log('File tree visibility changed:', showFileTree);
  }, [showFileTree]);




  if (!isVisible) {
    return null;
  }

  const handleCopy = async () => {
    if (selectedFile?.content) {
      try {
        await navigator.clipboard.writeText(selectedFile.content);
        showToast('Code copied to clipboard', 'success');
      } catch (error) {
        showToast('Failed to copy code', 'error');
      }
    }
  };

  const handleDownload = () => {
    if (selectedFile?.content) {
      const blob = new Blob([selectedFile.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded ${selectedFile.name}`, 'success');
    }
  };

  const getLanguageFromExtension = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'php': 'php',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'html': 'html',
      'xml': 'xml',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'bash',
      'fish': 'bash',
    };
    return langMap[ext || ''] || 'text';
  };

  const formatFileSize = (content: string): string => {
    const bytes = new TextEncoder().encode(content).length;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getLineCount = (content: string): number => {
    return content.split('\n').length;
  };

  const clearSelectionState = () => {
    setSelectionText('');
    setSelectionToolbarPos(null);
    setSelectedAction(null);
  };

  const handleTextSelection = () => {
    if (isEditing) return; // disable when editing
    const sel = window.getSelection();
    if (!sel) return clearSelectionState();
    const text = sel.toString();
    if (text.trim().length === 0) {
      clearSelectionState();
      return;
    }
    try {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      // position toolbar slightly above selection
      setSelectionToolbarPos({ x: rect.left + rect.width / 2, y: Math.max(0, rect.top - 8) });
      setSelectionText(text);
    } catch {
      clearSelectionState();
    }
  };

  const buildActionPrompt = (action: string, code: string) => {
    const language = selectedFile ? getLanguageFromExtension(selectedFile.name) : 'text';
    const filePath = selectedFile?.path || 'unknown file';
    switch (action) {
      case 'edit':
        return `You are assisting with targeted edits to a code fragment from ${filePath}. Provide only the updated code block(s) if changes are needed. If no changes, respond with: NO_CHANGE\n\nOriginal (${language}):\n\n\n\u0060\u0060\u0060${language}\n${code}\n\u0060\u0060\u0060`;
      case 'refactor':
        return `Refactor the following ${language} code from ${filePath} for clarity, performance, and maintainability. Keep external behavior identical. Return updated code only.\n\n\u0060\u0060\u0060${language}\n${code}\n\u0060\u0060\u0060`;
      case 'fix':
        return `Identify and fix any bugs, edge cases, or potential errors in this ${language} code from ${filePath}. Explain briefly then provide corrected code.\n\n\u0060\u0060\u0060${language}\n${code}\n\u0060\u0060\u0060`;
      case 'explain':
        return `Explain what the following ${language} code from ${filePath} does. Point out key design choices and any potential issues.\n\n\u0060\u0060\u0060${language}\n${code}\n\u0060\u0060\u0060`;
      default:
        return code;
    }
  };

  const sendPromptToChat = async (prompt: string) => {
    try {
      if (!currentApp?.id) {
        showToast('No app context to attach chat message', 'error');
        return;
      }
      const conversations = await appService.getAppConversations(currentApp.id);
      let conversationId = conversations[0]?.id;
      if (!conversationId) {
        conversationId = await window.electronAPI.db.createConversation({ appId: currentApp.id, title: `Conversation for ${currentApp.name}`, createdAt: Date.now() });
      }
      await window.electronAPI.db.addMessage({ conversationId, role: 'user', content: prompt, createdAt: Date.now() });
      showToast('Sent selection to chat', 'success');
      clearSelectionState();
    } catch (e) {
      console.error(e);
      showToast('Failed to send to chat', 'error');
    }
  };

  const sendPromptToClaude = async (prompt: string) => {
    try {
      const output = await window.electronAPI.claudeCode.execute(prompt, { cwd: currentApp?.path });
      // Optionally push to chat as assistant message for traceability
      if (currentApp?.id) {
        const conversations = await appService.getAppConversations(currentApp.id);
        const conversationId = conversations[0]?.id;
        if (conversationId) {
          await window.electronAPI.db.addMessage({ conversationId, role: 'assistant', content: `Claude Code CLI Output:\n\n${output}`, createdAt: Date.now() });
        }
      }
      showToast('Sent selection to Claude Code CLI', 'success');
      clearSelectionState();
    } catch (e) {
      console.error(e);
      showToast('Claude execution failed', 'error');
    }
  };

  const sendPromptToAider = async (prompt: string) => {
    try {
      const { model, apiKeySpec } = aiderStore.getCliArgs();
      const output = await window.electronAPI.aider.execute(prompt, { cwd: currentApp?.path, model, apiKeySpec });
      if (currentApp?.id) {
        const conversations = await appService.getAppConversations(currentApp.id);
        const conversationId = conversations[0]?.id;
        if (conversationId) {
          await window.electronAPI.db.addMessage({ conversationId, role: 'assistant', content: `Aider CLI Output:\n\n${output}`, createdAt: Date.now() });
        }
      }
      showToast('Sent selection to Aider CLI', 'success');
      clearSelectionState();
    } catch (e) {
      console.error(e);
      showToast('Aider execution failed', 'error');
    }
  };

  const handleDestination = (destination: string) => {
    if (!selectedAction || !selectionText) return;
    const prompt = buildActionPrompt(selectedAction, selectionText);
    if (destination === 'chat') return void sendPromptToChat(prompt);
    if (destination === 'claude') return void sendPromptToClaude(prompt);
    if (destination === 'aider') return void sendPromptToAider(prompt);
  };

  return (
    <div 
      className={`fixed top-0 left-0 right-0 bottom-0 z-50 transition-all duration-500 ease-in-out ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      } ${className}`}
    >
      <Card className="h-full rounded-t-2xl rounded-b-none border-t border-border/50 shadow-2xl bg-gradient-to-br from-background via-background to-background/95 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-border/30 bg-gradient-to-r from-prestige-primary/5 via-prestige-secondary/5 to-prestige-accent/5">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-prestige-primary to-prestige-secondary flex items-center justify-center">
                  <Code2 className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-xl font-semibold bg-gradient-to-r from-prestige-primary via-prestige-secondary to-prestige-accent bg-clip-text text-transparent">
                  {selectedFile ? selectedFile.name : (currentApp ? currentApp.name : 'Prestige Code Viewer')}
                </h3>
              </div>
              {selectedFile && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2 ml-11">
                  <span className="flex items-center gap-1">
                    <Folder className="w-3 h-3" />
                    {selectedFile.path}
                  </span>
                  <span className="text-prestige-secondary">•</span>
                  <span>{getLineCount(selectedFile.content || '')} lines</span>
                  <span className="text-prestige-secondary">•</span>
                  <span>{formatFileSize(selectedFile.content || '')}</span>
                  <span className="text-prestige-secondary">•</span>
                  <span className="capitalize px-2 py-1 bg-prestige-primary/10 text-prestige-primary rounded-md text-xs font-medium">
                    {getLanguageFromExtension(selectedFile.name)}
                  </span>
                </div>
              )}
              {!selectedFile && currentApp && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2 ml-11">
                  <span className="flex items-center gap-1">
                    <Folder className="w-3 h-3" />
                    {currentApp.files?.length || 0} files
                  </span>
                  <span className="text-prestige-secondary">•</span>
                  <span className="px-2 py-1 bg-prestige-secondary/10 text-prestige-secondary rounded-md text-xs font-medium">
                    Project files
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
                {selectedFile && !isEditing && (
                  <>
                    <Button
                      variant="premium"
                      size="sm"
                      onClick={handleCopy}
                      className="h-9 w-9 p-0 rounded-xl"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="premium"
                      size="sm"
                      onClick={handleDownload}
                      className="h-9 w-9 p-0 rounded-xl"
                      title="Download file"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="premium"
                      size="sm"
                      onClick={() => {
                        setEditedContent(selectedFile.content || '');
                        setIsEditing(true);
                      }}
                      className="h-9 w-9 p-0 rounded-xl"
                      title="Edit file"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>

                    {/* Diff toggle button - only show for modified files */}
                    {fileDiff && (
                      <Button
                        variant="premium"
                        size="sm"
                        onClick={() => setShowDiff(!showDiff)}
                        className={`h-9 px-4 rounded-xl ${showDiff 
                          ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg' 
                          : 'bg-white/20 backdrop-blur-sm hover:bg-white/30'
                        }`}
                        title="Toggle Diff View"
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Diff
                      </Button>
                    )}
                  </>
                )}
                {selectedFile && isEditing && (
                  <>
                    <Button
                      variant="premium"
                      size="sm"
                      onClick={async () => {
                        if (!currentApp) return;
                        setIsSaving(true);
                        try {
                          // Get the correct app path using FileSystemService  
                          const { FileSystemService } = await import('@/services/fileSystemService');
                          const fileSystemService = FileSystemService.getInstance();
                          const appPath = await fileSystemService.getAppPath(currentApp.name);
                          
                          // Files are stored in the 'files' subdirectory
                          const filesPath = await window.electronAPI.path.join(appPath, 'files');
                          const fullPath = await window.electronAPI.path.join(filesPath, selectedFile.path);
                          
                          await window.electronAPI.fs.writeFile(fullPath, editedContent);
                          // Mutate in-memory content (lightweight sync)
                          selectedFile.content = editedContent;
                          setIsEditing(false);
                          showToast('File saved', 'success');
                          
                          // Trigger git status refresh using currentApp.path (appName) for consistency
                          await gitService.onFileChanged(currentApp.path, selectedFile.path);
                        } catch (e) {
                          console.error('Save failed', e);
                          showToast('Failed to save file', 'error');
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      disabled={isSaving}
                      className="h-9 px-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                      title="Save file"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="premium"
                      size="sm"
                      disabled={isSaving}
                      onClick={() => { setIsEditing(false); setEditedContent(''); }}
                      className="h-9 px-4 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white"
                      title="Cancel editing"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </>
                )}
                
                {/* File tree and source control action buttons */}
                <Button
                  variant="premium"
                  size="sm"
                  onClick={() => {
                    const newState = !showFileTree;
                    console.log('Files button clicked. Current state:', showFileTree, 'New state:', newState);
                    setShowFileTree(newState);
                    if (newState) setShowSourceControl(false); // Hide source control when showing files
                  }}
                  className={`h-9 px-4 rounded-xl ${showFileTree 
                    ? 'bg-gradient-to-r from-prestige-primary to-prestige-secondary text-white shadow-lg' 
                    : 'bg-white/20 backdrop-blur-sm hover:bg-white/30'
                  }`}
                  title="Toggle File Tree"
                >
                  <Folder className="w-4 h-4 mr-2" />
                  Files
                </Button>
                
                <Button
                  variant="premium"
                  size="sm"
                  onClick={() => {
                    const newState = !showSourceControl;
                    console.log('Source Control button clicked. Current state:', showSourceControl, 'New state:', newState);
                    setShowSourceControl(newState);
                    if (newState) setShowFileTree(false); // Hide files when showing source control
                  }}
                  className={`h-9 px-4 rounded-xl ${showSourceControl 
                    ? 'bg-gradient-to-r from-prestige-primary to-prestige-secondary text-white shadow-lg' 
                    : 'bg-white/20 backdrop-blur-sm hover:bg-white/30'
                  }`}
                  title="Toggle Source Control"
                >
                  <GitBranch className="w-4 h-4 mr-2" />
                  Source Control
                </Button>

            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/20">
              <Button
                variant="premium"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-9 w-9 p-0 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/20"
                title={isExpanded ? "Minimize" : "Maximize"}
              >
                {isExpanded ? 
                  <ChevronDown className="w-4 h-4" /> : 
                  <ChevronUp className="w-4 h-4" />
                }
              </Button>
              
              <Button
                variant="premium"
                size="sm"
                onClick={hideCodeViewer}
                className="h-9 w-9 p-0 rounded-xl bg-red-500/20 backdrop-blur-sm hover:bg-red-500/30 text-red-400 hover:text-red-300 border border-red-500/30"
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 h-full overflow-hidden bg-gradient-to-br from-gray-50/50 via-white to-gray-50/80">
          <div className="h-full flex flex-col">
            {/* Code Content - Code viewer with file tree on the right */}
              <div className="h-full flex">
                {/* Code content area - takes main space like preview */}
                {/* Added min-w-0 to allow flex item to shrink and not push file tree off-screen */}
                <div className="flex-1 flex flex-col min-w-0">
                  {selectedFile ? (
                    <div className="h-full flex-1 min-w-0 relative">
                      {!isEditing && !showDiff && (
                        <div className="relative h-full">
                          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 rounded-lg border border-white/10 shadow-2xl overflow-hidden">
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-800/50 to-gray-800/50 border-b border-white/10">
                              <div className="flex items-center gap-3">
                                <div className="flex gap-1.5">
                                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                </div>
                                <span className="text-sm font-mono text-gray-400">{selectedFile.name}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {getLineCount(selectedFile.content || '')} lines • {formatFileSize(selectedFile.content || '')}
                              </div>
                            </div>
                            <pre
                              onMouseUp={handleTextSelection}
                              className={`relative p-6 text-sm font-mono leading-relaxed overflow-auto h-[calc(100%-60px)] text-gray-100 w-full selection:bg-prestige-primary/30 ${showFileTree ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}`}
                              style={{ backgroundColor: 'transparent' }}
                            >
                              <code className={`language-${getLanguageFromExtension(selectedFile.name)}`}>
                                {selectedFile.content}
                              </code>
                            </pre>
                          </div>
                        </div>
                      )}
                      
                      {!isEditing && showDiff && fileDiff && (
                        <div className="h-full relative">
                          <div className="absolute inset-0 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
                            <DiffViewer 
                              diff={fileDiff} 
                              filePath={selectedFile.path} 
                              className="h-full"
                            />
                          </div>
                        </div>
                      )}
                      {isEditing && (
                        <div className="h-full relative">
                          <div className="absolute inset-0 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-prestige-primary/10 to-prestige-secondary/10 border-b border-gray-200">
                              <div className="flex items-center gap-3">
                                <Edit3 className="w-4 h-4 text-prestige-primary" />
                                <span className="text-sm font-medium">Editing {selectedFile.name}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                Press Ctrl+S to save • Esc to cancel
                              </div>
                            </div>
                            <textarea
                              value={editedContent}
                              onChange={(e) => setEditedContent(e.target.value)}
                              spellCheck={false}
                              className="w-full h-[calc(100%-60px)] font-mono text-sm p-6 bg-white border-0 focus:outline-none resize-none text-gray-800"
                              style={{ tabSize: 2 }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : !currentApp ? (
                    <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-white text-gray-500">
                      <div className="text-center">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-prestige-primary/20 to-prestige-secondary/20 flex items-center justify-center">
                          <Folder className="w-12 h-12 text-prestige-primary" />
                        </div>
                        <div className="text-xl font-semibold text-gray-700 mb-2">No App Selected</div>
                        <div className="text-sm text-gray-500">Select an app to view its files</div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-white text-gray-500">
                      <div className="text-center">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-prestige-secondary/20 to-prestige-accent/20 flex items-center justify-center">
                          <Code2 className="w-12 h-12 text-prestige-secondary" />
                        </div>
                        <div className="text-xl font-semibold text-gray-700 mb-2">Select a File</div>
                        <div className="text-sm text-gray-500">Choose a file from the tree to view its code</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* File tree sidebar - toggleable like logs panel */}
                {currentApp && showFileTree && (
                  <div className="w-1/3 border-l border-gray-200/50 bg-gradient-to-b from-white to-gray-50/50 flex flex-col shrink-0 backdrop-blur-sm">
                    <div className="p-4 border-b border-gray-200/50 bg-gradient-to-r from-prestige-primary/5 to-prestige-secondary/5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-prestige-primary/20 to-prestige-secondary/20 flex items-center justify-center">
                          <Folder className="w-3 h-3 text-prestige-primary" />
                        </div>
                        <h3 className="font-semibold text-gray-800">Project Files</h3>
                      </div>
                      <div className="text-xs text-gray-500">
                        {currentApp.files?.length || 0} files in {currentApp.name}
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-auto">
                      <FileTreeView files={currentApp.files || []} />
                    </div>
                  </div>
                )}

                {/* Source Control sidebar */}
                {currentApp && showSourceControl && (
                  <div className="w-1/3 border-l border-gray-200/50 flex flex-col shrink-0">
                    <SourceControlPanel />
                  </div>
                )}
              </div>

          </div>
        </CardContent>
      </Card>
      {selectionToolbarPos && selectionText && (
        <div
          className="fixed z-[60] bg-gradient-to-r from-white via-white to-white/95 backdrop-blur-lg border border-white/20 shadow-2xl rounded-2xl p-4 text-xs flex flex-col gap-3 w-72"
          style={{ top: selectionToolbarPos.y, left: selectionToolbarPos.x - 144 }}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-prestige-primary to-prestige-secondary flex items-center justify-center">
                <Wand2 className="w-3 h-3 text-white" />
              </div>
              <span className="font-semibold text-gray-800 truncate max-w-[160px]">Code Actions</span>
            </div>
            <button onClick={clearSelectionState} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex gap-1.5 flex-wrap">
            {['edit','refactor','fix','explain'].map(action => (
              <button
                key={action}
                onClick={() => setSelectedAction(action)}
                className={`px-3 py-2 rounded-xl border text-[11px] capitalize flex items-center gap-1.5 transition-all duration-200 font-medium ${
                  selectedAction === action 
                    ? 'bg-gradient-to-r from-prestige-primary to-prestige-secondary text-white border-transparent shadow-lg scale-105' 
                    : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700'
                }`}
              >
                {action === 'edit' && <FileCode className="w-3 h-3" />}
                {action === 'refactor' && <Wand2 className="w-3 h-3" />}
                {action === 'fix' && <Wrench className="w-3 h-3" />}
                {action === 'explain' && <MessageCircle className="w-3 h-3" />}
                {action}
              </button>
            ))}
          </div>
          
          {selectedAction && (
            <div className="flex flex-col gap-2">
              <div className="text-[10px] uppercase text-gray-400 tracking-wider font-semibold">Send To</div>
              <div className="flex gap-1.5">
                <button onClick={() => handleDestination('chat')} className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 text-white hover:from-gray-600 hover:to-gray-700 text-[11px] font-medium transition-all duration-200 shadow-lg">
                  Chat
                </button>
                <button onClick={() => handleDestination('aider')} className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-400 hover:to-blue-500 text-[11px] font-medium transition-all duration-200 shadow-lg">
                  Aider
                </button>
                <button onClick={() => handleDestination('claude')} className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500 text-[11px] font-medium transition-all duration-200 shadow-lg">
                  Claude
                </button>
              </div>
              <div className="line-clamp-2 text-[10px] text-gray-500 mt-1 p-2 bg-gray-50 rounded-lg border border-gray-100 font-mono">
                {selectionText.slice(0,140)}{selectionText.length>140?'…':''}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}