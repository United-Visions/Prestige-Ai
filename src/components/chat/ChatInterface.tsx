import { useState, useEffect, useCallback } from 'react';
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
import { constructSystemPromptAsync, readAiRules } from '@/prompts/system_prompt';
import { aiModelServiceV2 as aiModelService, StreamChunk } from '@/services/aiModelService';
import { AdvancedAppManagementService } from '@/services/advancedAppManagementService';
import { PrestigeMarkdownRenderer } from './PrestigeMarkdownRenderer';
import { supportsThinking } from '@/utils/thinking';
import type { Message } from '@/types';
import { useEnhancedStreaming } from '@/services/enhancedStreamingService';

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

  const { showPreviewMode } = useCodeViewerStore();

  const [input, setInput] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(DEFAULT_TEMPLATE_ID);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [modelPreferencesDialogOpen, setModelPreferencesDialogOpen] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreamingResponse, setIsStreamingResponse] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Enhanced streaming service
  const { startEnhancedStream, cancelStream } = useEnhancedStreaming();

  useEffect(() => {
    loadApps();
  }, [loadApps]);

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
    if (currentApp.files && currentApp.files.length > 0) {
      fileStructure = generateFileStructure(currentApp.files);
    }
    
    return constructSystemPromptAsync({ 
      aiRules, 
      fileStructure,
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

    setInput('');
    setIsGenerating(true);
    setError(null);
    setStreamingContent('');
    setIsStreamingResponse(false);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      let conversationId: number;
      let currentMessages: Message[] = [];

      if (!currentApp) {
        const { setCurrentApp } = useAppStore.getState();
        await setCurrentApp(null);
        
        const { conversationId: newConversationId } = await createApp(content);
        conversationId = newConversationId;
        const appService = AdvancedAppManagementService.getInstance();
        const conversation = await appService.getConversation(newConversationId);
        currentMessages = conversation?.messages || [];
        
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
        
        // Get current messages and ensure they're properly ordered
        const appService = AdvancedAppManagementService.getInstance();
        const updatedConversation = await appService.getConversation(currentConversation.id);
        currentMessages = updatedConversation?.messages || [];
        
        // Force UI update by refreshing the current conversation in store
        // This ensures the user message appears immediately
        const { setCurrentConversation } = useAppStore.getState();
        setCurrentConversation(updatedConversation);
      }

      const systemPrompt = await getSystemPrompt();

      // Use enhanced streaming service with auto-fix capabilities
      setIsStreamingResponse(true);
      let agentResponse = '';

      const aiRequestFunction = async (prompt: string) => {
        return aiModelService.generateResponse(selectedModel, systemPrompt, [
          ...currentMessages,
          { id: Date.now(), content: prompt, role: 'user', createdAt: new Date(), conversationId }
        ]);
      };

      await startEnhancedStream(content, {
        onChunk: (chunk: string, fullResponse: string) => {
          if (controller.signal.aborted) return;
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
          } catch (err) {
            console.error('Error processing response:', err);
            await addMessage(conversationId, {
              content: agentResponse,
              role: 'assistant',
              createdAt: new Date()
            });
          } finally {
            setIsGenerating(false);
            setIsStreamingResponse(false);
            setStreamingContent('');
          }
        },
        onError: (error: Error) => {
          if (controller.signal.aborted) return;
          setError(error.message);
          setIsGenerating(false);
          setIsStreamingResponse(false);
          setStreamingContent('');
        },
        onAutoFixNeeded: (fixPrompt: string) => {
          console.log('🔧 Auto-fix needed:', fixPrompt);
        },
        enableAutoFix: true,
        enableAggressiveFixes: true,
        aiRequestFunction
      });


    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
      setIsStreamingResponse(false);
      setStreamingContent('');
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
      <div className="flex-1 flex flex-col">
        {/* Prestige Brand Header */}
        <PrestigeBrandHeader
          currentApp={currentApp}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          onApiKeyDialogOpen={() => setApiKeyDialogOpen(true)}
          onModelPreferencesOpen={() => setModelPreferencesDialogOpen(true)}
          onPreviewApp={handlePreviewApp}
        />

        {/* Main Content Area */}
        {!currentApp ? (
          <PrestigeWelcomeScreen
            selectedTemplateId={selectedTemplateId}
            onTemplateSelect={handleTemplateSelect}
            onQuickPrompt={handleQuickPrompt}
            onCreateWithTemplate={handleCreateWithSelectedTemplate}
          />
        ) : (
          <>
            <PrestigeChatArea
              currentApp={currentApp}
              currentConversation={currentConversation}
              isStreamingResponse={isStreamingResponse}
              streamingContent={streamingContent}
              isGenerating={isGenerating}
              onStopGeneration={handleStopGeneration}
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

        {/* Enhanced Chat Input */}
        <PrestigeChatInput
          value={input}
          onChange={setInput}
          onSend={handleSendMessage}
          disabled={isGenerating}
          placeholder={
            !currentApp 
              ? "Describe your dream application..." 
              : !currentConversation 
                ? "Start building something amazing..." 
                : "Continue the conversation..."
          }
        />
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
    </div>
  );
}