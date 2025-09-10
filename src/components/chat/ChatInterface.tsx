import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ApiKeyDialog } from '@/components/ApiKeyDialog';
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
import { constructSystemPrompt, readAiRules } from '@/prompts/system_prompt';
import { aiModelServiceV2 as aiModelService, StreamChunk } from '@/services/aiModelService';
import { AdvancedAppManagementService } from '@/services/advancedAppManagementService';
import { EnhancedMarkdownRenderer } from './EnhancedMarkdownRenderer';
import { supportsThinking } from '@/utils/thinking';
import type { Message } from '@/types';

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
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreamingResponse, setIsStreamingResponse] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  const getSystemPrompt = useCallback(async () => {
    if (!currentApp) return constructSystemPrompt({ aiRules: undefined });
    
    const aiRules = await readAiRules(currentApp.path);
    
    let fileStructure = '';
    if (currentApp.files && currentApp.files.length > 0) {
      fileStructure = generateFileStructure(currentApp.files);
    }
    
    return constructSystemPrompt({ 
      aiRules, 
      fileStructure 
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
        currentMessages = newConversation.messages || [];
        
        if (!currentMessages.some(m => m.role === 'user' && m.content === content)) {
          currentMessages.push({
            id: Date.now(),
            content,
            role: 'user',
            createdAt: new Date(),
            conversationId: newConversation.id
          });
        }
      } else {
        await addMessage(currentConversation.id, { 
          content, 
          role: 'user',
          createdAt: new Date()
        });
        conversationId = currentConversation.id;
        const appService = AdvancedAppManagementService.getInstance();
        const updatedConversation = await appService.getConversation(currentConversation.id);
        currentMessages = updatedConversation?.messages || [];
        
        if (!currentMessages.some(m => m.role === 'user' && m.content === content)) {
          currentMessages.push({
            id: Date.now(),
            content,
            role: 'user',
            createdAt: new Date(),
            conversationId: currentConversation.id
          });
        }
      }

      const systemPrompt = await getSystemPrompt();
      let agentResponse: string;

      if (supportsThinking(selectedModel.provider) || selectedModel.provider === 'anthropic' || selectedModel.provider === 'google') {
        setIsStreamingResponse(true);
        let fullResponse = '';
        let inThinkingBlock = false;
        let thinkingContent = '';

        const processResponse = async () => {
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
        };

        await aiModelService.streamResponse(
          selectedModel,
          systemPrompt,
          currentMessages,
          {
            onChunk: (chunk: StreamChunk) => {
              if (controller.signal.aborted) return;

              if (chunk.type === 'reasoning') {
                if (!inThinkingBlock) {
                  inThinkingBlock = true;
                  thinkingContent = '';
                }
                thinkingContent += chunk.content;
                
                setStreamingContent(prev => {
                  const thinkRegex = /<think>.*?(?:<\/think>|$)/s;
                  if (thinkRegex.test(prev)) {
                    return prev.replace(thinkRegex, `<think>${thinkingContent}${inThinkingBlock ? '' : '</think>'}`);
                  } else {
                    const nonThinkingContent = prev.replace(thinkRegex, '');
                    return `<think>${thinkingContent}${inThinkingBlock ? '' : '</think>'}\n\n${nonThinkingContent}`;
                  }
                });
              } else if (chunk.type === 'text-delta') {
                if (inThinkingBlock) {
                  inThinkingBlock = false;
                  setStreamingContent(prev => {
                    const updatedPrev = prev.replace(
                      /<think>.*?$/s, 
                      `<think>${thinkingContent}</think>`
                    );
                    return updatedPrev + '\n\n' + chunk.content;
                  });
                } else {
                  setStreamingContent(prev => {
                    const hasOpenThinking = prev.includes('<think>') && !prev.includes('</think>');
                    if (hasOpenThinking) {
                      const closedThinking = prev.replace(/<think>([^<]*)$/, `<think>$1</think>`);
                      return closedThinking + '\n\n' + chunk.content;
                    }
                    return prev + chunk.content;
                  });
                }
                fullResponse += chunk.content;
              }
            },
            onComplete: (response: string) => {
              if (controller.signal.aborted) return;
              agentResponse = response;
              processResponse();
            },
            onError: (error: string) => {
              if (controller.signal.aborted) return;
              setError(error);
              setIsGenerating(false);
              setIsStreamingResponse(false);
              setStreamingContent('');
            },
            settings: {
              thinkingBudget: -1
            }
          }
        );

        return;
      } else {
        agentResponse = await aiModelService.generateResponse(
          selectedModel,
          systemPrompt,
          currentMessages
        );
      }
      
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

      {/* Code Viewer Panel */}
      <CodeViewerPanel />
    </div>
  );
}