import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ApiKeyDialog } from '@/components/ApiKeyDialog';
import { ModelPreferencesDialog } from '@/components/ModelPreferencesDialog';
import { CodeViewerPanel } from '@/components/code/CodeViewerPanel';
import useAppStore from '@/stores/appStore';
import useCodeViewerStore from '@/stores/codeViewerStore';
import { DEFAULT_TEMPLATE_ID } from '@/templates';
import { AppSidebar } from '../apps/AppSidebar';
import { processContinuousAgentResponse } from '@/services/continuousAgentProcessor';

// Import our new branded components
import { PrestigeBrandHeader } from '@/components/PrestigeBrandHeader';
import { PrestigeWelcomeScreen } from '@/components/PrestigeWelcomeScreen';
import { PrestigeChatArea } from '@/components/PrestigeChatArea';
import { PrestigeChatInput } from '@/components/PrestigeChatInput';
import { ChatPreviewPanel } from './ChatPreviewPanel';
import { PreviewSlidePanel } from '@/components/preview/PreviewSlidePanel';
import { PreviewTab } from '@/components/preview/PreviewTab';
import { TodoSideView } from '@/components/todo/TodoSideView';
import { constructSystemPromptAsync, readAiRules } from '@/prompts/system_prompt';
import { aiModelServiceV2 as aiModelService, StreamChunk } from '@/services/aiModelService';
import { AdvancedAppManagementService } from '@/services/advancedAppManagementService';
import { FileSystemService } from '@/services/fileSystemService';
import { resolveAppPaths } from '@/utils/appPathResolver';
import { PrestigeMarkdownRenderer } from './PrestigeMarkdownRenderer';
import { supportsThinking } from '@/utils/thinking';
import type { Message } from '@/types';
import { useEnhancedStreaming } from '@/services/enhancedStreamingService';
import { autoModeService } from '@/services/autoModeService';

export function ChatInterface() {
  const {
    currentApp,
    currentConversation,
    isGenerating,
    error,
    selectedModel,
    loadApps,
    createApp,
    createConversation,
    addMessage,
    setIsGenerating,
    setError,
    setSelectedModel,
  } = useAppStore();

  const { showPreviewMode, showPreviewInChat } = useCodeViewerStore();

  const [input, setInput] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(DEFAULT_TEMPLATE_ID);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [modelPreferencesDialogOpen, setModelPreferencesDialogOpen] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreamingResponse, setIsStreamingResponse] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [pendingUserMessage, setPendingUserMessage] = useState<Message | null>(null);
  const firstChunkSeenRef = useRef(false);
  const continuationActiveRef = useRef(false);
  const [dismissedResumeBanner, setDismissedResumeBanner] = useState(false);
  const [resumeBriefs, setResumeBriefs] = useState([]);

  // Preview panel state
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);

  // Enhanced streaming service
  const { startEnhancedStream, cancelStream } = useEnhancedStreaming();

  // Agent is active when thinking or streaming
  const isAgentActive = isGenerating || isStreamingResponse;

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  // Load resume briefs when app changes
  useEffect(() => {
    if (currentApp && currentConversation && !dismissedResumeBanner) {
      autoModeService.getUnfinishedPlansForApp(currentApp.id).then(briefs => {
        const other = briefs.filter(b => b.conversationId !== currentConversation.id);
        setResumeBriefs(other);
      });
    } else {
      setResumeBriefs([]);
    }
  }, [currentApp, currentConversation, dismissedResumeBanner]);

  // Listen for API key dialog events from CodeViewerPanel
  useEffect(() => {
    const handleOpenApiKeyDialog = () => {
      setApiKeyDialogOpen(true);
    };

    window.addEventListener('openApiKeyDialog', handleOpenApiKeyDialog);
    
    // Expose model update function for API key store
    (window as any).updateSelectedModel = setSelectedModel;
    
    return () => {
      window.removeEventListener('openApiKeyDialog', handleOpenApiKeyDialog);
      delete (window as any).updateSelectedModel;
    };
  }, [setSelectedModel]);

  const getSystemPrompt = useCallback(async () => {
    if (!currentApp) return constructSystemPromptAsync({ aiRules: undefined });

    const aiRules = await readAiRules(currentApp.path);

    let fileStructure = '';
    let fileContents = '';
    if (currentApp.files && currentApp.files.length > 0) {
      fileStructure = generateFileStructure(currentApp.files);
      fileContents = await generateFileContents(currentApp.files, currentApp.name);
    }

    return constructSystemPromptAsync({
      aiRules,
      fileStructure,
      fileContents,
      appPath: currentApp.path
    });
  }, [currentApp]);

  const generateFileStructure = (files: any[]): string => {
    return files
      .map(file => {
        if (file.type === 'directory') {
          return `${file.path}/`;
        } else {
          return file.path;
        }
      })
      .sort()
      .join('\n');
  };

  const generateFileContents = async (files: any[], appName: string): Promise<string> => {
    const fileSystemService = FileSystemService.getInstance();
    const contentParts: string[] = [];

    // Define key files we want to include in context (to limit size)
    const keyFilePatterns = [
      /^src\/.*\.(js|jsx|ts|tsx)$/,
      /^.*\.json$/,
      /^.*\.md$/,
      /^src\/.*\.css$/,
      /^.*\.(html|htm)$/,
      /^.*\.env.*$/
    ];

    // Flatten files and filter for key files
    const flattenFiles = (fileList: any[], prefix = ''): any[] => {
      const result: any[] = [];
      for (const file of fileList) {
        const fullPath = prefix ? `${prefix}/${file.name}` : file.name;
        if (file.type === 'file') {
          result.push({ ...file, path: fullPath });
        } else if (file.children) {
          result.push(...flattenFiles(file.children, fullPath));
        }
      }
      return result;
    };

    const flatFiles = flattenFiles(files);
    const keyFiles = flatFiles.filter(file =>
      keyFilePatterns.some(pattern => pattern.test(file.path))
    );

    // Load content for key files
    try {
      const { filesPath } = await resolveAppPaths({ name: appName, path: appName } as any);

      for (const file of keyFiles.slice(0, 10)) { // Limit to 10 files to avoid prompt bloat
        try {
          const fullPath = await window.electronAPI.path.join(filesPath, file.path);
          const content = await fileSystemService.readFile(fullPath);
          if (content && content.trim()) {
            contentParts.push(`## File: ${file.path}\n\`\`\`\n${content}\n\`\`\``);
          }
        } catch (error) {
          console.warn(`Failed to read file ${file.path}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to generate file contents:', error);
    }

    return contentParts.join('\n\n');
  };

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
    }
    setIsGenerating(false);
    setIsStreamingResponse(false);
    setStreamingContent('');
    setAbortController(null);
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isGenerating) return;

    // Create immediate user message for display
    const immediateUserMessage: Message = {
      id: Date.now(),
      content,
      role: 'user',
      createdAt: new Date(),
      conversationId: currentConversation?.id || 0
    };

    // Show user message immediately
    setPendingUserMessage(immediateUserMessage);

    setInput('');
    setIsGenerating(true);
    setError(null);
  setStreamingContent('');
  setIsStreamingResponse(false);
  firstChunkSeenRef.current = false;

    const controller = new AbortController();
    setAbortController(controller);

    try {
      let conversationId: number;
      let currentMessages: Message[] = [];
      let appIdForPlan: number | null = null;

      if (!currentApp) {
        const { setCurrentApp } = useAppStore.getState();
        await setCurrentApp(null);
        
        const { conversationId: newConversationId } = await createApp(content);
        conversationId = newConversationId;
        const appService = AdvancedAppManagementService.getInstance();
  const conversation = await appService.getConversation(newConversationId);
        currentMessages = conversation?.messages || [];
  const app = await appService.getApp(conversation?.appId || 0);
  appIdForPlan = app?.id || null;
        
        if (!currentMessages.some(m => m.role === 'user' && m.content === content)) {
          currentMessages.push({
            id: Date.now(),
            content,
            role: 'user',
            createdAt: new Date(),
            conversationId: newConversationId
          });
        }
      } else if (!currentConversation) {
        const newConversation = await createConversation(currentApp.id, undefined, 'Conversation');
  conversationId = newConversation.id;
  appIdForPlan = currentApp.id;
        
        // Add user message to the new conversation
        await addMessage(conversationId, { 
          content, 
          role: 'user',
          createdAt: new Date()
        });
        
        // Get updated conversation with the user message
        const appService = AdvancedAppManagementService.getInstance();
        const updatedConversation = await appService.getConversation(conversationId);
        currentMessages = updatedConversation?.messages || [];
        
        // Force UI update by refreshing the current conversation in store
        const { setCurrentConversation } = useAppStore.getState();
        setCurrentConversation(updatedConversation);
      } else {
        // Add user message to database and immediately update UI
        await addMessage(currentConversation.id, { 
          content, 
          role: 'user',
          createdAt: new Date()
        });
  conversationId = currentConversation.id;
  appIdForPlan = currentApp.id;
        
        // Get current messages and ensure they're properly ordered
        const appService = AdvancedAppManagementService.getInstance();
        const updatedConversation = await appService.getConversation(currentConversation.id);
        currentMessages = updatedConversation?.messages || [];
        
        // Force UI update by refreshing the current conversation in store
        // This ensures the user message appears immediately
        const { setCurrentConversation } = useAppStore.getState();
        setCurrentConversation(updatedConversation);

        // Clear pending message since it's now in the conversation
        setPendingUserMessage(null);
      }

      const systemPrompt = await getSystemPrompt();

      // Ensure a development plan exists for this conversation
      const existingPlans = await autoModeService.getPlans(conversationId);
      let activePlan = existingPlans[0];
      if (!activePlan && appIdForPlan && selectedModel) {
        activePlan = await autoModeService.generatePlanForConversation(
          appIdForPlan,
          conversationId,
          selectedModel,
          systemPrompt,
          currentMessages,
          content
        );
      }

  // Use enhanced streaming service with auto-fix capabilities
  // Show thinking first; switch to streaming on first chunk
      let agentResponse = '';

      const aiRequestFunction = async (prompt: string) => {
        return aiModelService.generateResponse(selectedModel, systemPrompt, [
          ...currentMessages,
          { id: Date.now(), content: prompt, role: 'user', createdAt: new Date(), conversationId }
        ]);
      };

      continuationActiveRef.current = !!activePlan;
      await startEnhancedStream(content, {
        selectedModel,
        systemPrompt,
        onChunk: (chunk: string, fullResponse: string) => {
          if (controller.signal.aborted) return;
          if (!firstChunkSeenRef.current) {
            firstChunkSeenRef.current = true;
            setIsStreamingResponse(true);
          }
          setStreamingContent(fullResponse);
        },
        onComplete: async (response: string) => {
          if (controller.signal.aborted) return;
          agentResponse = response;

          try {
            const agentResult = await processContinuousAgentResponse(agentResponse);

            if (agentResult && agentResult.chatContent) {
              const { chatContent, chatSummary } = agentResult;
              await addMessage(conversationId, {
                content: chatContent,
                role: 'assistant',
                createdAt: new Date()
              });
              if (chatSummary) {
                useAppStore.getState().setChatSummary(chatSummary);
              }
            } else {
              await addMessage(conversationId, {
                content: agentResponse,
                role: 'assistant',
                createdAt: new Date()
              });
            }

            // Force refresh the conversation to show the new message immediately
            const appService = AdvancedAppManagementService.getInstance();
            const updatedConversation = await appService.getConversation(conversationId);
            const { setCurrentConversation } = useAppStore.getState();
            setCurrentConversation(updatedConversation);
            // Clear pending user placeholder immediately once assistant message is committed
            setPendingUserMessage(null);

          } catch (err) {
            console.error('Error processing response:', err);
            await addMessage(conversationId, {
              content: agentResponse,
              role: 'assistant',
              createdAt: new Date()
            });
          } finally {
            // Clear streaming flags if not in continuation loop
            setTimeout(() => {
              if (!continuationActiveRef.current) {
                setIsGenerating(false);
                setIsStreamingResponse(false);
                setStreamingContent('');
              }
            }, 50);
          }
        },
        onError: (error: Error) => {
          if (controller.signal.aborted) return;
          setError(error.message);
          setIsGenerating(false);
          setIsStreamingResponse(false);
          setStreamingContent('');
          setPendingUserMessage(null);
        },
        onAutoFixNeeded: (fixPrompt: string) => {
          console.log('🔧 Auto-fix needed:', fixPrompt);
        },
        enableAutoFix: true,
        enableAggressiveFixes: true,
        aiRequestFunction,
        continuation: activePlan ? { conversationId, planId: activePlan.id } : undefined,
        onContinuationDone: async () => {
          // Summarize recent completions and remaining
          const plans = await autoModeService.getPlans(conversationId);
          const plan = plans.find(p => p.id === (activePlan?.id || '')) || plans[0];
          if (plan) {
            const completed = plan.phases
              .flatMap(p => p.todos.map(t => ({ ...t, phase: p.title })))
              .filter(t => t.completedAt)
              .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
              .slice(0, 5);
            const remaining = plan.phases.flatMap(p => p.todos).filter(t => t.status !== 'completed').length;
            const md = `<details><summary>Recently Completed ToDos</summary>\n\n${completed.map(t => `- [x] ${t.title} _(phase: ${t.phase})_`).join('\n')}\n\nRemaining: ${remaining}\n</details>`;
            await addMessage(conversationId, { content: md, role: 'assistant', createdAt: new Date() });
          }
          continuationActiveRef.current = false;
          setIsGenerating(false);
          setIsStreamingResponse(false);
          setStreamingContent('');
        }
      });


    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      if (!continuationActiveRef.current) {
        setIsGenerating(false);
        setIsStreamingResponse(false);
        setStreamingContent('');
      }
      setAbortController(null);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    handleSendMessage(prompt);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
  };

  const handleCreateWithSelectedTemplate = () => {
    const templateName = 'selected template';
    handleQuickPrompt(`Create a new app using ${templateName}`);
  };

  const handlePreviewApp = () => {
    if (currentApp) {
      showPreviewMode();
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      
      {/* Main Chat Area */}
      <div className="flex-1 flex">
        {/* Main column */}
        <div className="flex-1 flex flex-col">
        {/* Prestige Brand Header - fade/collapse during agent activity; hidden when preview is showing */}
        {!showPreviewInChat && (
          <div className={`collapse-fade ${isAgentActive ? 'hide' : 'show'}`}>
            <PrestigeBrandHeader
              currentApp={currentApp}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              onApiKeyDialogOpen={() => setApiKeyDialogOpen(true)}
              onModelPreferencesOpen={() => setModelPreferencesDialogOpen(true)}
              onPreviewApp={handlePreviewApp}
            />
          </div>
        )}

        {/* Main Content Area - Hidden when preview is showing */}
        {!showPreviewInChat && (
          <>
            {!currentApp ? (
              <PrestigeWelcomeScreen
                selectedTemplateId={selectedTemplateId}
                onTemplateSelect={handleTemplateSelect}
                onQuickPrompt={handleQuickPrompt}
                onCreateWithTemplate={handleCreateWithSelectedTemplate}
              />
            ) : (
              <>
                {/* Resume suggestion banner for unfinished plans across conversations */}
                {currentApp && currentConversation && !dismissedResumeBanner && resumeBriefs.length > 0 && (
                  <div className="px-6 mb-2">
                    <Card>
                      <CardContent className="p-3 text-sm flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="text-muted-foreground">I noticed unfinished plans in other conversations. Continue one?</div>
                          <button
                            onClick={() => setDismissedResumeBanner(true)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {resumeBriefs.slice(0,3).map(b => (
                            <button
                              key={b.planId}
                              className="px-3 py-1 rounded-md border text-xs hover:bg-muted"
                              onClick={async () => {
                                const plans = await autoModeService.getPlans(b.conversationId);
                                const src = plans.find(p => p.id === b.planId);
                                if (!src || !currentConversation) return;
                                const cloned = await autoModeService.clonePlanToConversation(src, currentConversation.id);
                                setIsGenerating(true);
                                setError(null);
                                firstChunkSeenRef.current = false;
                                continuationActiveRef.current = true;
                                const systemPrompt = await getSystemPrompt();
                                await startEnhancedStream(`Resume plan: ${cloned.title}`, {
                                  selectedModel,
                                  systemPrompt,
                                  onChunk: (chunk, full) => {
                                    if (!firstChunkSeenRef.current) {
                                      firstChunkSeenRef.current = true;
                                      setIsStreamingResponse(true);
                                    }
                                    setStreamingContent(full);
                                  },
                                  onComplete: async () => {},
                                  onError: (e) => { setError(e.message); },
                                  continuation: { conversationId: currentConversation.id, planId: cloned.id },
                                  onContinuationDone: async () => {
                                    continuationActiveRef.current = false;
                                    setIsGenerating(false);
                                    setIsStreamingResponse(false);
                                    setStreamingContent('');
                                  }
                                });
                              }}
                            >
                              {b.title} • {b.remainingCount} left
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                <PrestigeChatArea
                  currentApp={currentApp}
                  currentConversation={currentConversation}
                  isStreamingResponse={isStreamingResponse}
                  streamingContent={streamingContent}
                  isGenerating={isGenerating}
                  onStopGeneration={handleStopGeneration}
                  pendingUserMessage={pendingUserMessage}
                />

                {error && (
                  <div className="px-6">
                    <Card className="border-destructive bg-destructive/5">
                      <CardContent className="p-4">
                        <p className="text-destructive text-sm font-medium">{error}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Chat Preview Panel - Takes full height when active */}
        {showPreviewInChat && (
          <div className="flex-1 flex flex-col px-6 py-6">
            <ChatPreviewPanel />
          </div>
        )}

        {/* Enhanced Chat Input - fade/collapse during agent activity */}
        <div className={`collapse-fade ${isAgentActive ? 'hide' : 'show'}`}>
          <PrestigeChatInput
            value={input}
            onChange={setInput}
            onSend={handleSendMessage}
            disabled={isAgentActive}
            placeholder={
              !currentApp 
                ? "Describe your dream application..." 
                : !currentConversation 
                  ? "Start building something amazing..." 
                  : "Continue the conversation..."
            }
          />
        </div>
        </div>

        {/* Right side ToDo view (visible when app/conversation) */}
        {currentApp && currentConversation && (
          <TodoSideView />
        )}
      </div>

      {/* API Key Dialog */}
      <ApiKeyDialog 
        isOpen={apiKeyDialogOpen} 
        onClose={() => setApiKeyDialogOpen(false)} 
      />

      {/* Model Preferences Dialog */}
      <ModelPreferencesDialog 
        isOpen={modelPreferencesDialogOpen} 
        onClose={() => setModelPreferencesDialogOpen(false)}
        onApiKeyDialogOpen={() => {
          setModelPreferencesDialogOpen(false);
          setApiKeyDialogOpen(true);
        }}
      />

      {/* Code Viewer Panel */}
      <CodeViewerPanel />

      {/* Preview Tab - Always visible on right side when app exists */}
      {currentApp && (
        <PreviewTab
          isRunning={false}
          isOpen={showPreviewPanel}
          onClick={() => setShowPreviewPanel(!showPreviewPanel)}
          currentAppName={currentApp.name}
        />
      )}

      {/* Preview Slide Panel */}
      <PreviewSlidePanel
        isOpen={showPreviewPanel}
        onClose={() => setShowPreviewPanel(false)}
        currentApp={currentApp}
        selectedModel={selectedModel}
        currentConversation={currentConversation}
      />
    </div>
  );
}