import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import useCodeViewerStore from '@/stores/codeViewerStore';
import useAppStore from '@/stores/appStore';
import { X, Copy, Download, ChevronDown, ChevronUp, Code2, Play, RotateCcw, Square, RefreshCw, Terminal, Hammer, AlertTriangle, Send, Folder, Edit3, Save, XCircle, Wand2, FileCode, Wrench, MessageCircle } from 'lucide-react';
import { showToast } from '@/utils/toast';
import { PreviewIframe } from '@/components/preview/PreviewIframe';
import { FileTreeView } from '@/components/project/FileTreeView';
import { AppError, AppOutput } from '@/types/appTypes';
import { AdvancedAppManagementService } from '@/services/advancedAppManagementService';
import { useAiderStore } from '@/stores/aiderStore';
import { ErrorDetectionService, type ErrorReport } from '@/services/errorDetectionService';

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
    setShowFileTree
  } = useCodeViewerStore();

  const { currentApp, selectedModel } = useAppStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const activeTab = storeActiveTab;
  
  // Preview state
  const [appUrl, setAppUrl] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [outputs, setOutputs] = useState<AppOutput[]>([]);
  const [errors, setErrors] = useState<AppError[]>([]);
  const [showLogs, setShowLogs] = useState(true); // Start with logs visible by default
  const [iframeKey, setIframeKey] = useState(0);
  const [errorReport, setErrorReport] = useState<ErrorReport | null>(null);
  const [isFixingErrors, setIsFixingErrors] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectionText, setSelectionText] = useState('');
  const [selectionToolbarPos, setSelectionToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const aiderStore = useAiderStore();

  const appService = AdvancedAppManagementService.getInstance();
  const errorService = ErrorDetectionService.getInstance();

  useEffect(() => {
    // Reset expansion state when a new file is selected
    if (selectedFile) {
      setIsExpanded(false);
    }
  }, [selectedFile]);
  
  // Debug log to track file tree state
  useEffect(() => {
    console.log('File tree visibility changed:', showFileTree);
  }, [showFileTree]);

  useEffect(() => {
    // Clear preview state immediately when switching apps
    setAppUrl(null);
    setOriginalUrl(null);
    setOutputs([]);
    setErrors([]);
    setIsRunning(false);
    
    if (currentApp?.id) {
      // Check if the new app is actually running
      appService.isAppRunning(currentApp.id).then(running => {
        setIsRunning(running);
        
        // If the app is running, it will set appUrl through the output handler
        // No need to do anything special here
      });
    }
  }, [currentApp, appService]);

  const handleOutput = (output: AppOutput) => {
    // Use functional update to avoid potential performance issues
    setOutputs(prev => {
      // Limit output history to prevent memory issues (keep last 1000 entries)
      const newOutputs = [...prev, output];
      const limitedOutputs = newOutputs.length > 1000 ? newOutputs.slice(-1000) : newOutputs;
      
      // Update error report when outputs change (debounced)
      if (currentApp?.id && output.type === 'stderr') {
        setTimeout(() => {
          const report = errorService.createErrorReport(limitedOutputs, errors);
          setErrorReport(report);
        }, 1000); // Debounce error detection for outputs
      }
      
      return limitedOutputs;
    });
    
    // Check for proxy server start message
    const proxyMatch = output.message.match(/\[prestige-proxy-server\]started=\[(.*?)\]/);
    if (proxyMatch && proxyMatch[1]) {
      const proxyUrl = proxyMatch[1];
      const originalMatch = output.message.match(/original=\[(.*?)\]/);
      const originalUrl = originalMatch ? originalMatch[1] : null;
      
      setAppUrl(proxyUrl);
      setOriginalUrl(originalUrl);
      setIframeKey(prev => prev + 1); // Force iframe refresh
    }
  };

  const handleError = (error: AppError) => {
    setErrors(prev => {
      // Limit error history to prevent memory issues (keep last 100 entries)
      const newErrors = [...prev, error];
      const limitedErrors = newErrors.length > 100 ? newErrors.slice(-100) : newErrors;
      
      // Update error report when errors change
      if (currentApp?.id) {
        setTimeout(() => {
          const report = errorService.createErrorReport(outputs, limitedErrors);
          setErrorReport(report);
        }, 500); // Debounce error detection
      }
      
      return limitedErrors;
    });
  };

  const startApp = async () => {
    if (!currentApp?.id) return;
    
    // Set loading state immediately to provide instant feedback
    setIsStarting(true);
    setShowLogs(true);
    
    // Use setTimeout to defer heavy operations and avoid blocking the UI
    setTimeout(async () => {
      setOutputs([]);
      setErrors([]);
      
      // Add starting message to logs
      setOutputs([{
        type: 'stdout',
        message: `Starting app: ${currentApp.name || `App ${currentApp.id}`}...`,
        timestamp: Date.now(),
        appId: currentApp.id
      }]);
      
      // Add debug message to test logs display
      setTimeout(() => {
        setOutputs(prev => [...prev, {
          type: 'stdout',
          message: `Debug: Calling appService.runApp(${currentApp.id})...`,
          timestamp: Date.now(),
          appId: currentApp.id
        }]);
      }, 500);
      
      try {
        await appService.runApp(currentApp.id, handleOutput, handleError);
        setIsRunning(true);
      } catch (error) {
        console.error('Failed to start app:', error);
        handleError({
          type: 'build-error-report',
          payload: {
            message: `Failed to start app: ${error}`,
            stack: error instanceof Error ? error.stack : undefined
          },
          timestamp: Date.now(),
          appId: currentApp.id
        });
      } finally {
        setIsStarting(false);
      }
    }, 0);
  };

  const stopApp = async () => {
    if (!currentApp?.id) return;
    
    try {
      // Clear URLs first to prevent iframe errors
      setAppUrl(null);
      setOriginalUrl(null);
      setIframeKey(prev => prev + 1);
      
      // Then stop the app
      await appService.stopApp(currentApp.id);
      setIsRunning(false);
      
      // Add stopping message
      setOutputs(prev => [...prev, {
        type: 'stdout',
        message: `Stopped app: ${currentApp.name || `App ${currentApp.id}`}`,
        timestamp: Date.now(),
        appId: currentApp.id
      }]);
    } catch (error) {
      console.error('Failed to stop app:', error);
      handleError({
        type: 'build-error-report',
        payload: {
          message: `Failed to stop app: ${error}`,
          stack: error instanceof Error ? error.stack : undefined
        },
        timestamp: Date.now(),
        appId: currentApp.id
      });
    }
  };

  const restartApp = async (removeNodeModules: boolean = false) => {
    if (!currentApp?.id) return;
    
    // Set loading state immediately to provide instant feedback
    setIsStarting(true);
    setShowLogs(true);
    
    // Use setTimeout to defer heavy operations and avoid blocking the UI
    setTimeout(async () => {
      setOutputs([]);
      setErrors([]);
      
      // Add restarting message to logs
      setOutputs([{
        type: 'stdout',
        message: `Restarting app: ${currentApp.name || `App ${currentApp.id}`}${removeNodeModules ? ' (clearing node_modules)' : ''}...`,
        timestamp: Date.now(),
        appId: currentApp.id
      }]);
      
      try {
        await appService.restartApp(currentApp.id, handleOutput, handleError, removeNodeModules);
        setIsRunning(true);
      } catch (error) {
        console.error('Failed to restart app:', error);
        handleError({
          type: 'build-error-report',
          payload: {
            message: `Failed to restart app: ${error}`,
            stack: error instanceof Error ? error.stack : undefined
          },
          timestamp: Date.now(),
          appId: currentApp.id
        });
      } finally {
        setIsStarting(false);
      }
    }, 0);
  };

  const refreshIframe = () => {
    setIframeKey(prev => prev + 1);
  };

  const rebuildApp = async () => {
    if (!currentApp?.id) return;
    
    // Set loading state immediately to provide instant feedback
    setIsStarting(true);
    setShowLogs(true);
    
    // Use setTimeout to defer heavy operations and avoid blocking the UI
    setTimeout(async () => {
      setOutputs([]);
      setErrors([]);
      
      // Add rebuilding message to logs
      setOutputs([{
        type: 'stdout',
        message: `Rebuilding app: ${currentApp.name || `App ${currentApp.id}`} (clearing node_modules and reinstalling from updated package.json)...`,
        timestamp: Date.now(),
        appId: currentApp.id
      }]);
      
      try {
        await appService.rebuildApp(currentApp.id, handleOutput, handleError);
        setIsRunning(true);
      } catch (error) {
        console.error('Failed to rebuild app:', error);
        handleError({
          type: 'build-error-report',
          payload: {
            message: `Failed to rebuild app: ${error}`,
            stack: error instanceof Error ? error.stack : undefined
          },
          timestamp: Date.now(),
          appId: currentApp.id
        });
      } finally {
        setIsStarting(false);
      }
    }, 0);
  };

  const autoFixErrors = async () => {
    if (!currentApp?.id || !errorReport?.hasErrors) return;
    
    setIsFixingErrors(true);
    
    try {
      // Use the currently selected model instead of hardcoding Claude Code
      if (false) {
        // This code path is no longer used
        throw new Error('Claude Code service removed');
        
        // This code path is no longer used
        console.log('Claude Code service has been removed');
        if (currentApp && errorReport) {
          console.log('Error report:', errorReport);
          
          // Process response would go here
          console.log('Would process response here');
          
          // Clear error report after successful fix attempt
          setErrorReport(null);
          showToast('Attempted to fix errors using Claude Code. Check the logs for results.', 'info');
        } else {
          showToast('No active conversation found for this app', 'error');
        }
      } else {
        // Use the standard AI model service for other models
        const { aiModelServiceV2: aiModelService } = await import('@/services/aiModelService');
        const { constructSystemPrompt, readAiRules } = await import('@/prompts/system_prompt');
        
        // Get the current conversation for this app
        const conversations = await appService.getAppConversations(currentApp.id);
        const activeConversation = conversations[0]; // Get the most recent conversation
        
        if (activeConversation) {
          // Build the system prompt with current app context
          // Defensive: ensure we pass either absolute 'files' directory or app name; readAiRules will normalize
          const aiRules = await readAiRules(currentApp.path);
          let fileStructure = '';
          if (currentApp.files && currentApp.files.length > 0) {
            fileStructure = currentApp.files
              .map(file => file.type === 'directory' ? `${file.path}/` : file.path)
              .sort()
              .join('\n');
          }
          const systemPrompt = constructSystemPrompt({ aiRules, fileStructure });
          
          const fixPrompt = errorService.generateErrorFixPrompt(errorReport);
          console.log('Auto-fix prompt (Other models):', fixPrompt);
          
          // Get conversation messages for context
          const fullConversation = await appService.getConversation(activeConversation.id);
          const messages = fullConversation?.messages || [];
          
          // Add the fix prompt as a user message
          const conversationMessages = [...messages, {
            id: Date.now(),
            content: fixPrompt,
            role: 'user' as const,
            createdAt: new Date(),
            conversationId: activeConversation.id
          }];
          
          // Generate response using the selected model
          const response = await aiModelService.generateResponse(
            selectedModel,
            systemPrompt,
            conversationMessages
          );
          
          // Process the response to apply file changes
          const { processAgentResponse } = await import('@/services/agentResponseProcessor');
          const agentResult = await processAgentResponse(response);
          
          // Add the fix prompt and response to the conversation
          await appService.addMessageToConversation(activeConversation.id, 'user', fixPrompt);
          const responseContent = agentResult?.chatContent || response;
          await appService.addMessageToConversation(activeConversation.id, 'assistant', responseContent);
          
          // Clear error report after successful fix attempt
          setErrorReport(null);
          showToast(`Attempted to fix errors using ${selectedModel.name}. Check the logs for results.`, 'info');
        } else {
          showToast('No active conversation found for this app', 'error');
        }
      }
    } catch (error) {
      console.error('Failed to auto-fix errors:', error);
      showToast('Failed to auto-fix errors: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setIsFixingErrors(false);
    }
  };

  const sendErrorsToTerminal = () => {
    if (!errorReport?.hasErrors) {
      showToast('No errors to send', 'info');
      return;
    }

    const errorPrompt = errorService.generateErrorFixPrompt(errorReport);
    
    // Store error prompt globally so terminal can access it
    // Store error prompt for terminal use (if needed)
    (window as any).prestigeErrorPrompt = errorPrompt;
    
    // Notify user
    showToast(`Prepared error summary for terminal. Switch to terminal mode and type "fix-errors".`, 'success');
  };

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
      className={`fixed top-0 left-0 right-0 bottom-0 z-50 transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      } ${className}`}
    >
      <Card className="h-full rounded-t-lg rounded-b-none border-t shadow-lg bg-background">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold">
                {selectedFile ? selectedFile.name : (currentApp ? currentApp.name : 'Code Viewer')}
              </h3>
              {selectedFile && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{selectedFile.path}</span>
                  <span>•</span>
                  <span>{getLineCount(selectedFile.content || '')} lines</span>
                  <span>•</span>
                  <span>{formatFileSize(selectedFile.content || '')}</span>
                  <span>•</span>
                  <span className="capitalize">{getLanguageFromExtension(selectedFile.name)}</span>
                </div>
              )}
              {!selectedFile && currentApp && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{currentApp.files?.length || 0} files</span>
                  <span>•</span>
                  <span>Project files</span>
                </div>
              )}
            </div>
            
            {/* Tabs */}
            <div className="ml-4">
              <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                <button
                  onClick={() => setActiveTab('code')}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-1 ${
                    activeTab === 'code'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'hover:bg-muted/80'
                  }`}
                >
                  <Code2 className="w-4 h-4" />
                  Code
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-1 ${
                    activeTab === 'preview'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'hover:bg-muted/80'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  Preview
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {activeTab === 'code' && (
              <>
                {selectedFile && !isEditing && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-8 w-8 p-0"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDownload}
                      className="h-8 w-8 p-0"
                      title="Download file"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditedContent(selectedFile.content || '');
                        setIsEditing(true);
                      }}
                      className="h-8 w-8 p-0"
                      title="Edit file"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {selectedFile && isEditing && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (!currentApp) return;
                        setIsSaving(true);
                        try {
                          // Attempt to resolve absolute path: assume files root is app.path + '/files'
                          // selectedFile.path is relative inside project
                          // Attempt to derive full path. Prefer currentApp.path (assumed absolute to project root), else fallback to desktop pattern.
                          let projectRoot = currentApp.path;
                          if (!projectRoot) {
                            const desktop = await window.electronAPI.app.getDesktopPath();
                            projectRoot = await window.electronAPI.path.join(desktop, 'prestige-ai', currentApp.name);
                          }
                          const fullPath = await window.electronAPI.path.join(projectRoot, selectedFile.path);
                          await window.electronAPI.fs.writeFile(fullPath, editedContent);
                          // Mutate in-memory content (lightweight sync)
                          selectedFile.content = editedContent;
                          setIsEditing(false);
                          showToast('File saved', 'success');
                        } catch (e) {
                          console.error('Save failed', e);
                          showToast('Failed to save file', 'error');
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      disabled={isSaving}
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                      title="Save file"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isSaving}
                      onClick={() => { setIsEditing(false); setEditedContent(''); }}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      title="Cancel editing"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </>
                )}
                
                {/* File tree action buttons */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newState = !showFileTree;
                    console.log('Files button clicked. Current state:', showFileTree, 'New state:', newState);
                    setShowFileTree(newState);
                  }}
                  className={`h-8 px-3 ${showFileTree ? 'bg-blue-100 text-blue-700' : ''}`}
                  title="Toggle File Tree"
                >
                  <Folder className="w-4 h-4 mr-1" />
                  Files
                </Button>
              </>
            )}
            
            {activeTab === 'preview' && (
              <>
                {!isRunning ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={startApp}
                    disabled={isStarting || !currentApp}
                    className="h-8 px-3"
                    title="Start App"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    {isStarting ? 'Starting...' : 'Start'}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={stopApp}
                    className="h-8 px-3"
                    title="Stop App"
                  >
                    <Square className="w-4 h-4 mr-1" />
                    Stop
                  </Button>
                )}
                
                {isRunning && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => restartApp(false)}
                      disabled={isStarting}
                      className="h-8 px-3"
                      title="Restart App"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Restart
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={rebuildApp}
                      disabled={isStarting}
                      className="h-8 px-3"
                      title="Rebuild App (clean node_modules & reinstall from updated package.json)"
                    >
                      <Hammer className="w-4 h-4 mr-1" />
                      Rebuild
                    </Button>
                  </>
                )}
                
                {errorReport?.hasErrors && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={autoFixErrors}
                      disabled={isFixingErrors}
                      className="h-8 px-3 text-orange-600 hover:text-orange-700"
                      title={`Fix ${errorReport.buildErrors.length + errorReport.runtimeErrors.length} error(s) automatically`}
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      {isFixingErrors ? 'Fixing...' : `Fix (${errorReport.buildErrors.length + errorReport.runtimeErrors.length})`}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={sendErrorsToTerminal}
                      className="h-8 px-3 text-blue-600 hover:text-blue-700"
                      title="Send error summary to terminal for Claude Code CLI"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Send to Terminal
                    </Button>
                  </>
                )}
                
                {appUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshIframe}
                    className="h-8 px-3"
                    title="Refresh Preview"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refresh
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLogs(!showLogs)}
                  className={`h-8 px-3 ${showLogs ? 'bg-blue-100 text-blue-700' : ''}`}
                  title="Toggle Logs"
                >
                  <Terminal className="w-4 h-4 mr-1" />
                  Logs
                </Button>
              </>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
              title={isExpanded ? "Minimize" : "Maximize"}
            >
              {isExpanded ? 
                <ChevronDown className="w-4 h-4" /> : 
                <ChevronUp className="w-4 h-4" />
              }
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={hideCodeViewer}
              className="h-8 w-8 p-0"
              title="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 h-full overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Code Tab Content - Code viewer with file tree on the right */}
            {activeTab === 'code' && (
              <div className="h-full flex">
                {/* Code content area - takes main space like preview */}
                {/* Added min-w-0 to allow flex item to shrink and not push file tree off-screen */}
                <div className="flex-1 flex flex-col min-w-0">
                  {selectedFile ? (
                    <div className="h-full flex-1 min-w-0 relative">
                      {!isEditing && (
                        <pre
                          onMouseUp={handleTextSelection}
                          className={`relative p-4 text-sm font-mono leading-relaxed overflow-auto h-full bg-gray-50 w-full selection:bg-blue-300/60 ${showFileTree ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'} `}
                        >
                          <code className={`language-${getLanguageFromExtension(selectedFile.name)}`}>
                            {selectedFile.content}
                          </code>
                        </pre>
                      )}
                      {isEditing && (
                        <textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          spellCheck={false}
                          className="absolute inset-0 w-full h-full font-mono text-sm p-4 bg-white border-0 focus:outline-none resize-none"
                        />
                      )}
                    </div>
                  ) : !currentApp ? (
                    <div className="h-full flex items-center justify-center bg-gray-50 text-gray-500">
                      <div className="text-center">
                        <Folder className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <div className="text-lg font-medium">No App Selected</div>
                        <div className="text-sm mt-2">Select an app to view its files</div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center bg-gray-50 text-gray-500">
                      <div className="text-center">
                        <Folder className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <div className="text-lg font-medium">Select a File</div>
                        <div className="text-sm mt-2">Choose a file from the tree to view its code</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* File tree sidebar - toggleable like logs panel */}
                {currentApp && showFileTree && (
                  <div className="w-1/3 border-l bg-gray-50 flex flex-col shrink-0">
                    <div className="p-3 border-b bg-white">
                      <h3 className="font-medium">Project Files</h3>
                      <div className="text-xs text-gray-500 mt-1">
                        {currentApp.files?.length || 0} files
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-auto">
                      <FileTreeView files={currentApp.files || []} />
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Preview Tab Content */}
            {activeTab === 'preview' && (
              <div className="h-full flex">
                {/* Preview Area */}
                <div className="flex-1 flex flex-col">
                  {!currentApp ? (
                    <div className="h-full flex items-center justify-center bg-gray-50 text-gray-500">
                      <div className="text-center">
                        <div className="text-lg font-medium">No App Selected</div>
                        <div className="text-sm mt-2">Select an app to see its preview</div>
                      </div>
                    </div>
                  ) : !isRunning ? (
                    <div className="h-full flex items-center justify-center bg-gray-50 text-gray-500">
                      <div className="text-center">
                        <Play className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <div className="text-lg font-medium">App Not Running</div>
                        <div className="text-sm mt-2">Click Start to run your app</div>
                      </div>
                    </div>
                  ) : (
                    <div key={iframeKey} className="h-full flex-1">
                      <PreviewIframe
                        appUrl={appUrl}
                        appId={currentApp.id}
                        onError={handleError}
                        iframeKey={iframeKey}
                      />
                    </div>
                  )}
                </div>

                {/* Logs Sidebar - Show when logs are enabled */}
                {showLogs && (
                  <div className="w-1/3 border-l bg-gray-50 flex flex-col">
                    <div className="p-3 border-b bg-white">
                      <h3 className="font-medium">Logs & Errors</h3>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => setOutputs([])}
                          className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                        >
                          Clear Logs
                        </button>
                        <button
                          onClick={() => setErrors([])}
                          className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                        >
                          Clear Errors
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-auto p-3 space-y-2">
                      {/* Errors */}
                      {errors.map((error, index) => (
                        <div key={`error-${index}`} className="p-2 bg-red-50 border border-red-200 rounded">
                          <div className="font-medium text-red-800 text-sm">{error.type}</div>
                          <div className="text-red-700 text-xs mt-1">{error.payload.message}</div>
                          {error.payload.file && (
                            <div className="text-red-600 text-xs mt-1">File: {error.payload.file}</div>
                          )}
                          {error.payload.stack && (
                            <pre className="text-red-600 text-xs mt-1 whitespace-pre-wrap overflow-auto max-h-20">
                              {error.payload.stack}
                            </pre>
                          )}
                        </div>
                      ))}
                      
                      {/* Outputs */}
                      {outputs.map((output, index) => (
                        <div key={`output-${index}`} className={`p-2 rounded text-xs font-mono ${
                          output.type === 'stderr' ? 'bg-yellow-50 text-yellow-800' : 'bg-gray-50 text-gray-700'
                        }`}>
                          <div className="text-xs text-gray-500 mb-1">
                            {new Date(output.timestamp).toLocaleTimeString()}
                          </div>
                          <pre className="whitespace-pre-wrap">{output.message}</pre>
                        </div>
                      ))}
                      
                      {outputs.length === 0 && errors.length === 0 && (
                        <div className="text-gray-500 text-sm text-center mt-8">
                          <div>No logs or errors yet</div>
                          <div className="text-xs mt-2">
                            App ID: {currentApp?.id} | Running: {isRunning ? 'Yes' : 'No'} | Starting: {isStarting ? 'Yes' : 'No'}
                          </div>
                          <div className="text-xs mt-1">
                            ShowLogs: {showLogs ? 'Yes' : 'No'} | ActiveTab: {activeTab}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Status Footer */}
                    <div className="border-t bg-white p-3">
                      <div className="space-y-2 text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          <span className="font-medium">{isRunning ? 'Running' : 'Stopped'}</span>
                        </div>
                        
                        {originalUrl && (
                          <div className="truncate">
                            <span className="font-medium">Dev Server:</span> {originalUrl}
                          </div>
                        )}
                        
                        {appUrl && (
                          <div className="truncate">
                            <span className="font-medium">Proxy:</span> {appUrl}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-1 border-t">
                          <div>
                            <span className="font-medium">Logs:</span> {outputs.length}
                          </div>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${errors.length > 0 ? 'bg-red-500' : 'bg-gray-400'}`}></div>
                            <span><span className="font-medium">Errors:</span> {errors.length}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {selectionToolbarPos && selectionText && (
        <div
          className="fixed z-[60] bg-white border shadow-lg rounded-md p-2 text-xs flex flex-col gap-2 w-60"
          style={{ top: selectionToolbarPos.y, left: selectionToolbarPos.x - 120 }}
        >
          <div className="flex justify-between items-center">
            <span className="font-medium truncate max-w-[140px]">Code Actions</span>
            <button onClick={clearSelectionState} className="text-gray-400 hover:text-gray-600">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-1 flex-wrap">
            {['edit','refactor','fix','explain'].map(action => (
              <button
                key={action}
                onClick={() => setSelectedAction(action)}
                className={`px-2 py-1 rounded border text-[11px] capitalize flex items-center gap-1 hover:bg-gray-100 ${selectedAction === action ? 'bg-blue-100 border-blue-400' : 'border-gray-300'}`}
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
            <div className="flex flex-col gap-1">
              <div className="text-[10px] uppercase text-gray-500 tracking-wide">Send To</div>
              <div className="flex gap-1">
                <button onClick={() => handleDestination('chat')} className="flex-1 px-2 py-1 rounded bg-gray-800 text-white hover:bg-gray-700 text-[11px]">Chat</button>
                <button onClick={() => handleDestination('aider')} className="flex-1 px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 text-[11px]">Aider</button>
                <button onClick={() => handleDestination('claude')} className="flex-1 px-2 py-1 rounded bg-amber-600 text-white hover:bg-amber-500 text-[11px]">Claude</button>
              </div>
              <div className="line-clamp-2 text-[10px] text-gray-500 mt-1">{selectionText.slice(0,140)}{selectionText.length>140?'…':''}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}