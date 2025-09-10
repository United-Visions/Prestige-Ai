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
            
            {/* Premium Tabs */}
            <div className="ml-6">
              <div className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-white/50 to-white/30 backdrop-blur-sm p-1.5 shadow-inner border border-white/20">
                <button
                  onClick={() => setActiveTab('code')}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300 gap-2 ${
                    activeTab === 'code'
                      ? 'bg-gradient-to-r from-prestige-primary to-prestige-secondary text-white shadow-lg scale-105'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/30'
                  }`}
                >
                  <Code2 className="w-4 h-4" />
                  <span>Code</span>
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300 gap-2 ${
                    activeTab === 'preview'
                      ? 'bg-gradient-to-r from-prestige-primary to-prestige-secondary text-white shadow-lg scale-105'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/30'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  <span>Preview</span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {activeTab === 'code' && (
              <>
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
                
                {/* File tree action buttons */}
                <Button
                  variant="premium"
                  size="sm"
                  onClick={() => {
                    const newState = !showFileTree;
                    console.log('Files button clicked. Current state:', showFileTree, 'New state:', newState);
                    setShowFileTree(newState);
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
              </>
            )}
            
            {activeTab === 'preview' && (
              <>
                {!isRunning ? (
                  <Button
                    variant="premium"
                    size="sm"
                    onClick={startApp}
                    disabled={isStarting || !currentApp}
                    className="h-9 px-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
                    title="Start App"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {isStarting ? 'Starting...' : 'Start App'}
                  </Button>
                ) : (
                  <Button
                    variant="premium"
                    size="sm"
                    onClick={stopApp}
                    className="h-9 px-4 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg"
                    title="Stop App"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop App
                  </Button>
                )}
                
                {isRunning && (
                  <>
                    <Button
                      variant="premium"
                      size="sm"
                      onClick={() => restartApp(false)}
                      disabled={isStarting}
                      className="h-9 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white"
                      title="Restart App"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restart
                    </Button>
                    
                    <Button
                      variant="premium"
                      size="sm"
                      onClick={rebuildApp}
                      disabled={isStarting}
                      className="h-9 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white"
                      title="Rebuild App (clean node_modules & reinstall from updated package.json)"
                    >
                      <Hammer className="w-4 h-4 mr-2" />
                      Rebuild
                    </Button>
                  </>
                )}
                
                {errorReport?.hasErrors && (
                  <>
                    <Button
                      variant="premium"
                      size="sm"
                      onClick={autoFixErrors}
                      disabled={isFixingErrors}
                      className="h-9 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg animate-pulse"
                      title={`Fix ${errorReport.buildErrors.length + errorReport.runtimeErrors.length} error(s) automatically`}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      {isFixingErrors ? 'Fixing...' : `Auto-Fix (${errorReport.buildErrors.length + errorReport.runtimeErrors.length})`}
                    </Button>
                    
                    <Button
                      variant="premium"
                      size="sm"
                      onClick={sendErrorsToTerminal}
                      className="h-9 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                      title="Send error summary to terminal for Claude Code CLI"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send to Terminal
                    </Button>
                  </>
                )}
                
                {appUrl && (
                  <Button
                    variant="premium"
                    size="sm"
                    onClick={refreshIframe}
                    className="h-9 px-4 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 border border-white/30"
                    title="Refresh Preview"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                )}
                
                <Button
                  variant="premium"
                  size="sm"
                  onClick={() => setShowLogs(!showLogs)}
                  className={`h-9 px-4 rounded-xl ${showLogs 
                    ? 'bg-gradient-to-r from-prestige-primary to-prestige-secondary text-white shadow-lg' 
                    : 'bg-white/20 backdrop-blur-sm hover:bg-white/30 border border-white/30'
                  }`}
                  title="Toggle Logs"
                >
                  <Terminal className="w-4 h-4 mr-2" />
                  Logs
                </Button>
              </>
            )}
            
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
            {/* Code Tab Content - Code viewer with file tree on the right */}
            {activeTab === 'code' && (
              <div className="h-full flex">
                {/* Code content area - takes main space like preview */}
                {/* Added min-w-0 to allow flex item to shrink and not push file tree off-screen */}
                <div className="flex-1 flex flex-col min-w-0">
                  {selectedFile ? (
                    <div className="h-full flex-1 min-w-0 relative">
                      {!isEditing && (
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
              </div>
            )}
            
            {/* Preview Tab Content */}
            {activeTab === 'preview' && (
              <div className="h-full flex">
                {/* Preview Area */}
                <div className="flex-1 flex flex-col">
                  {!currentApp ? (
                    <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-white text-gray-500">
                      <div className="text-center">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-prestige-primary/20 to-prestige-secondary/20 flex items-center justify-center">
                          <Play className="w-12 h-12 text-prestige-primary" />
                        </div>
                        <div className="text-xl font-semibold text-gray-700 mb-2">No App Selected</div>
                        <div className="text-sm text-gray-500">Select an app to see its preview</div>
                      </div>
                    </div>
                  ) : !isRunning ? (
                    <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-white text-gray-500">
                      <div className="text-center">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                          <Play className="w-12 h-12 text-green-600" />
                        </div>
                        <div className="text-xl font-semibold text-gray-700 mb-2">App Not Running</div>
                        <div className="text-sm text-gray-500 mb-4">Click Start to run your app and see the preview</div>
                        <Button
                          variant="premium"
                          size="lg"
                          onClick={startApp}
                          disabled={isStarting || !currentApp}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-3 rounded-xl shadow-lg"
                        >
                          <Play className="w-5 h-5 mr-2" />
                          {isStarting ? 'Starting App...' : 'Start App'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div key={iframeKey} className="h-full flex-1 relative">
                      <div className="absolute inset-0 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
                        {appUrl && (
                          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200/50">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-sm font-medium text-green-700">Live Preview</span>
                            </div>
                            <div className="text-xs text-green-600 font-mono">
                              {originalUrl || appUrl}
                            </div>
                          </div>
                        )}
                        <PreviewIframe
                          appUrl={appUrl}
                          appId={currentApp.id}
                          onError={handleError}
                          iframeKey={iframeKey}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhanced Logs Sidebar */}
                {showLogs && (
                  <div className="w-1/3 border-l border-gray-200/50 bg-gradient-to-b from-slate-900 via-gray-900 to-slate-800 flex flex-col text-white backdrop-blur-sm">
                    <div className="p-4 border-b border-white/10 bg-gradient-to-r from-slate-800/50 to-gray-800/50">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center">
                          <Terminal className="w-3 h-3 text-green-400" />
                        </div>
                        <h3 className="font-semibold text-white">Console Logs</h3>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setOutputs([])}
                          className="px-3 py-1.5 text-xs bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors border border-red-500/30"
                        >
                          Clear Logs
                        </button>
                        <button
                          onClick={() => setErrors([])}
                          className="px-3 py-1.5 text-xs bg-yellow-500/20 text-yellow-300 rounded-lg hover:bg-yellow-500/30 transition-colors border border-yellow-500/30"
                        >
                          Clear Errors
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-auto p-4 space-y-2 bg-slate-900/50 backdrop-blur-sm">
                      {/* Errors */}
                      {errors.map((error, index) => (
                        <div key={`error-${index}`} className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg backdrop-blur-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            <div className="font-medium text-red-300 text-sm">{error.type}</div>
                          </div>
                          <div className="text-red-200 text-xs font-mono">{error.payload.message}</div>
                          {error.payload.file && (
                            <div className="text-red-300 text-xs mt-2 flex items-center gap-1">
                              <FileCode className="w-3 h-3" />
                              {error.payload.file}
                            </div>
                          )}
                          {error.payload.stack && (
                            <pre className="text-red-200/70 text-xs mt-2 whitespace-pre-wrap overflow-auto max-h-20 bg-red-900/20 p-2 rounded border border-red-500/20">
                              {error.payload.stack}
                            </pre>
                          )}
                        </div>
                      ))}
                      
                      {/* Outputs */}
                      {outputs.map((output, index) => (
                        <div key={`output-${index}`} className={`p-3 rounded-lg text-xs font-mono backdrop-blur-sm ${
                          output.type === 'stderr' 
                            ? 'bg-yellow-500/10 text-yellow-200 border border-yellow-500/30' 
                            : 'bg-green-500/10 text-green-200 border border-green-500/30'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs text-gray-400">
                              {new Date(output.timestamp).toLocaleTimeString()}
                            </div>
                            <div className={`w-2 h-2 rounded-full ${
                              output.type === 'stderr' ? 'bg-yellow-400' : 'bg-green-400'
                            }`}></div>
                          </div>
                          <pre className="whitespace-pre-wrap text-xs leading-relaxed">{output.message}</pre>
                        </div>
                      ))}
                      
                      {outputs.length === 0 && errors.length === 0 && (
                        <div className="text-gray-400 text-sm text-center mt-12">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-blue-500/10 flex items-center justify-center border border-white/10">
                            <Terminal className="w-8 h-8 text-gray-500" />
                          </div>
                          <div className="font-medium mb-2">No logs or errors yet</div>
                          <div className="text-xs text-gray-500 space-y-1">
                            <div>App ID: {currentApp?.id}</div>
                            <div>Status: {isRunning ? 'Running' : 'Stopped'} {isStarting ? '(Starting...)' : ''}</div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Enhanced Status Footer */}
                    <div className="border-t border-white/10 bg-gradient-to-r from-slate-800/80 to-gray-800/80 p-4 backdrop-blur-sm">
                      <div className="space-y-3 text-xs text-gray-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></div>
                            <span className="font-medium">{isRunning ? 'Running' : 'Stopped'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${errors.length > 0 ? 'bg-red-400 animate-pulse' : 'bg-gray-500'}`}></div>
                            <span>Errors: {errors.length}</span>
                          </div>
                        </div>
                        
                        {originalUrl && (
                          <div className="truncate bg-slate-800/50 p-2 rounded border border-white/10">
                            <span className="text-gray-400">Dev:</span> 
                            <span className="text-blue-300 ml-2">{originalUrl}</span>
                          </div>
                        )}
                        
                        {appUrl && (
                          <div className="truncate bg-slate-800/50 p-2 rounded border border-white/10">
                            <span className="text-gray-400">Proxy:</span> 
                            <span className="text-green-300 ml-2">{appUrl}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                          <div className="text-gray-400">
                            Logs: <span className="text-white">{outputs.length}</span>
                          </div>
                          <div className="text-gray-400">
                            Tab: <span className="text-white capitalize">{activeTab}</span>
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