import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// This comment is to trigger a file re-check by the TypeScript server.
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { EnhancedModelPicker } from '@/components/EnhancedModelPicker';
import { ApiKeyDialog } from '@/components/ApiKeyDialog';
import { TemplateSelector } from '@/components/TemplateSelector';
import { CodeViewerPanel } from '@/components/code/CodeViewerPanel';
import { Badge } from '@/components/ui/badge';
import useAppStore from '@/stores/appStore';
import useCodeViewerStore from '@/stores/codeViewerStore';
import { DEFAULT_TEMPLATE_ID, getTemplateById } from '@/templates';
import { Sparkles, FileText, Code, Zap, Play, Settings, ChevronDown, Loader, StopCircle, Terminal as TerminalIcon } from 'lucide-react';
import { AppSidebar } from '../apps/AppSidebar';
import { processContinuousAgentResponse } from '@/services/continuousAgentProcessor';
import { constructSystemPrompt, readAiRules } from '@/prompts/system_prompt';
import { aiModelService } from '@/services/aiModelService';
import { ClaudeCodeService } from '@/services/claudeCodeService';
import { AdvancedAppManagementService } from '@/services/advancedAppManagementService';
import { EnhancedMarkdownRenderer } from './EnhancedMarkdownRenderer';
import { supportsThinking } from '@/utils/thinking';
import { RealTerminal } from '@/components/terminal/RealTerminal';
export function ChatInterface() {
    const { currentApp, currentConversation, isGenerating, error, selectedModel, loadApps, createApp, createConversation, addMessage, setIsGenerating, setError, setSelectedModel, } = useAppStore();
    const { showPreviewMode } = useCodeViewerStore();
    const [input, setInput] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState(DEFAULT_TEMPLATE_ID);
    const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [isStreamingResponse, setIsStreamingResponse] = useState(false);
    const [abortController, setAbortController] = useState(null);
    const [showTerminalMode, setShowTerminalMode] = useState(false);
    // Determine if we should show terminal mode (Claude Code or Aider CLI)
    const isClaudeCodeSelected = selectedModel.name === 'claude-code' || selectedModel.provider === 'claude-code';
    const isAiderSelected = selectedModel.name === 'aider-cli' || selectedModel.provider === 'aider';
    const hasTerminalIntegration = isClaudeCodeSelected || isAiderSelected;
    // Debug logging
    console.log('🔍 Model Selection Debug:', {
        selectedModel,
        isClaudeCodeSelected,
        showTerminalMode
    });
    useEffect(() => {
        if (hasTerminalIntegration) {
            setShowTerminalMode(true);
        }
        else {
            setShowTerminalMode(false);
        }
    }, [hasTerminalIntegration]);
    useEffect(() => {
        loadApps();
    }, [loadApps]);
    const getSystemPrompt = useCallback(async () => {
        if (!currentApp)
            return constructSystemPrompt({ aiRules: undefined });
        // Pass stored app.path (relative app name); readAiRules will resolve to prestige-ai/<app>/files
        const aiRules = await readAiRules(currentApp.path);
        // Generate file structure for context
        let fileStructure = '';
        if (currentApp.files && currentApp.files.length > 0) {
            fileStructure = generateFileStructure(currentApp.files);
        }
        return constructSystemPrompt({
            aiRules,
            fileStructure
        });
    }, [currentApp]);
    // Helper function to generate file structure string
    const generateFileStructure = (files) => {
        return files
            .map(file => {
            if (file.type === 'directory') {
                return `${file.path}/`;
            }
            else {
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
    const handleSendMessage = async (content) => {
        if (!content.trim() || isGenerating)
            return;
        setInput('');
        setIsGenerating(true);
        setError(null);
        setStreamingContent('');
        setIsStreamingResponse(false);
        // Create abort controller for streaming
        const controller = new AbortController();
        setAbortController(controller);
        try {
            let conversationId;
            let currentMessages = [];
            if (!currentApp) {
                // Ensure clean state before creating new app
                // This handles any edge cases where currentApp is null but cleanup wasn't triggered
                const { setCurrentApp } = useAppStore.getState();
                await setCurrentApp(null);
                const { conversationId: newConversationId } = await createApp(content);
                conversationId = newConversationId;
                // Get the updated conversation with messages after app creation
                const appService = AdvancedAppManagementService.getInstance();
                const conversation = await appService.getConversation(newConversationId);
                currentMessages = conversation?.messages || [];
                // Ensure we have the user message in the conversation
                if (!currentMessages.some(m => m.role === 'user' && m.content === content)) {
                    currentMessages.push({
                        id: Date.now(),
                        content,
                        role: 'user',
                        createdAt: new Date(),
                        conversationId: newConversationId
                    });
                }
            }
            else if (!currentConversation) {
                // If a conversation does not exist yet for this app, we create one implicitly using the first user message as initial message
                const newConversation = await createConversation(currentApp.id, undefined, 'Conversation');
                conversationId = newConversation.id;
                currentMessages = newConversation.messages || [];
                // Ensure we have the user message in the conversation
                if (!currentMessages.some(m => m.role === 'user' && m.content === content)) {
                    currentMessages.push({
                        id: Date.now(),
                        content,
                        role: 'user',
                        createdAt: new Date(),
                        conversationId: newConversation.id
                    });
                }
            }
            else {
                await addMessage(currentConversation.id, {
                    content,
                    role: 'user',
                    createdAt: new Date()
                });
                conversationId = currentConversation.id;
                // Get the updated conversation with the new message
                const appService = AdvancedAppManagementService.getInstance();
                const updatedConversation = await appService.getConversation(currentConversation.id);
                currentMessages = updatedConversation?.messages || [];
                // Ensure we have the user message in the conversation
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
            let agentResponse;
            if (selectedModel.provider === 'claude-code' || (selectedModel.provider === 'auto' && selectedModel.name === 'Claude Code')) {
                // Use the existing ClaudeCodeService for the CLI agent
                const claudeService = ClaudeCodeService.getInstance();
                agentResponse = await claudeService.continueConversation(conversationId, content);
            }
            else if (supportsThinking(selectedModel.provider) || selectedModel.provider === 'anthropic' || selectedModel.provider === 'google') {
                // Use streaming for models that support it
                setIsStreamingResponse(true);
                let fullResponse = '';
                let inThinkingBlock = false;
                let thinkingContent = '';
                // Define processResponse before the streaming call
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
                        }
                        else {
                            // If processing fails, add the raw response
                            await addMessage(conversationId, {
                                content: agentResponse,
                                role: 'assistant',
                                createdAt: new Date()
                            });
                        }
                    }
                    catch (err) {
                        console.error('Error processing response:', err);
                        // Add raw response as fallback
                        await addMessage(conversationId, {
                            content: agentResponse,
                            role: 'assistant',
                            createdAt: new Date()
                        });
                    }
                    finally {
                        setIsGenerating(false);
                        setIsStreamingResponse(false);
                        setStreamingContent('');
                    }
                };
                await aiModelService.streamResponse(selectedModel, systemPrompt, currentMessages, {
                    onChunk: (chunk) => {
                        if (controller.signal.aborted)
                            return;
                        if (chunk.type === 'reasoning') {
                            // Handle thinking content
                            if (!inThinkingBlock) {
                                inThinkingBlock = true;
                                thinkingContent = '';
                            }
                            thinkingContent += chunk.content;
                            // Update streaming content to show thinking block in real-time
                            setStreamingContent(prev => {
                                // Find if there's already a thinking block
                                const thinkRegex = /<think>.*?(?:<\/think>|$)/s;
                                if (thinkRegex.test(prev)) {
                                    // Replace existing thinking content
                                    return prev.replace(thinkRegex, `<think>${thinkingContent}${inThinkingBlock ? '' : '</think>'}`);
                                }
                                else {
                                    // Add new thinking block at the beginning
                                    const nonThinkingContent = prev.replace(thinkRegex, '');
                                    return `<think>${thinkingContent}${inThinkingBlock ? '' : '</think>'}\n\n${nonThinkingContent}`;
                                }
                            });
                        }
                        else if (chunk.type === 'text-delta') {
                            // Handle regular response content
                            if (inThinkingBlock) {
                                // Close thinking block when we get text content
                                inThinkingBlock = false;
                                setStreamingContent(prev => {
                                    const updatedPrev = prev.replace(/<think>.*?$/s, `<think>${thinkingContent}</think>`);
                                    return updatedPrev + '\n\n' + chunk.content;
                                });
                            }
                            else {
                                // Just add the text content
                                setStreamingContent(prev => {
                                    // Ensure thinking block is properly closed if it exists
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
                    onComplete: (response) => {
                        if (controller.signal.aborted)
                            return;
                        agentResponse = response;
                        processResponse();
                    },
                    onError: (error) => {
                        if (controller.signal.aborted)
                            return;
                        setError(error);
                        setIsGenerating(false);
                        setIsStreamingResponse(false);
                        setStreamingContent('');
                    },
                    settings: {
                        thinkingBudget: -1 // Dynamic thinking
                    }
                });
                return; // Exit early for streaming responses
            }
            else {
                // Use the regular AIModelService for non-streaming models
                agentResponse = await aiModelService.generateResponse(selectedModel, systemPrompt, currentMessages);
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
            }
            else {
                // If processing fails, add the raw response
                await addMessage(conversationId, {
                    content: agentResponse,
                    role: 'assistant',
                    createdAt: new Date()
                });
            }
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
        }
        finally {
            setIsGenerating(false);
            setIsStreamingResponse(false);
            setStreamingContent('');
            setAbortController(null);
        }
    };
    const handleQuickPrompt = (prompt) => {
        setInput(prompt);
        handleSendMessage(prompt);
    };
    const handleTemplateSelect = (templateId) => {
        setSelectedTemplateId(templateId);
    };
    const handleCreateWithSelectedTemplate = () => {
        const template = getTemplateById(selectedTemplateId);
        const templateName = template?.title || 'selected template';
        handleQuickPrompt(`Create a new app using ${templateName}`);
    };
    const handlePreviewApp = () => {
        if (currentApp) {
            // The app should already be selected when this is called from the header,
            // but ensure consistency
            showPreviewMode();
        }
    };
    const quickPrompts = [
        { icon: _jsx(Code, { className: "w-4 h-4" }), text: 'Create a React todo app', prompt: 'Create a React todo application with add, delete, and toggle functionality' },
        { icon: _jsx(FileText, { className: "w-4 h-4" }), text: 'Build a landing page', prompt: 'Create a modern landing page with HTML, CSS, and JavaScript' },
        { icon: _jsx(Zap, { className: "w-4 h-4" }), text: 'Make a Node.js API', prompt: 'Create a RESTful API using Node.js and Express with user endpoints' },
    ];
    return (_jsxs("div", { className: "flex h-screen bg-background", children: [_jsx(AppSidebar, {}), _jsxs("div", { className: "flex-1 flex flex-col", children: [_jsx("div", { className: "border-b bg-card p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Sparkles, { className: "w-6 h-6 text-primary" }), _jsx("h1", { className: "text-2xl font-bold", children: "Prestige-AI" })] }), currentApp && (_jsxs("div", { className: "text-sm text-muted-foreground", children: ["/ ", currentApp.name] }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(EnhancedModelPicker, { selectedModel: selectedModel, onModelSelect: setSelectedModel, onApiKeyDialogOpen: () => setApiKeyDialogOpen(true) }), hasTerminalIntegration && (_jsxs(Button, { size: "sm", variant: showTerminalMode ? "default" : "outline", onClick: () => setShowTerminalMode(!showTerminalMode), className: "gap-2", children: [_jsx(TerminalIcon, { className: "w-4 h-4" }), showTerminalMode ? 'Chat Mode' : (isAiderSelected ? 'Aider Terminal' : 'Terminal Mode')] })), currentApp && (_jsxs(Button, { size: "sm", variant: "outline", onClick: () => handlePreviewApp(), children: [_jsx(Play, { className: "w-4 h-4 mr-1" }), "Preview"] }))] })] }) }), _jsxs("div", { className: "flex-1 flex flex-col", style: { padding: showTerminalMode ? '0' : '1rem' }, children: [showTerminalMode ? (
                            /* Claude Code Terminal Mode */
                            _jsx("div", { className: "flex-1 flex", children: _jsx(RealTerminal, { onClose: () => setShowTerminalMode(false) }, "real-terminal" // Force re-render when switching modes
                                ) })) : !currentApp ? (_jsx("div", { className: "flex-1 flex items-center justify-center overflow-y-auto space-y-4", children: _jsxs("div", { className: "text-center max-w-2xl w-full", children: [_jsx(Sparkles, { className: "w-16 h-16 text-primary mx-auto mb-4" }), _jsx("h2", { className: "text-2xl font-semibold mb-2", children: "Welcome to Prestige-AI" }), _jsx("p", { className: "text-muted-foreground mb-6", children: "I'm your AI development assistant. I can help you create applications, write code, and build projects." }), _jsxs("div", { className: "mb-6", children: [_jsx("h3", { className: "text-lg font-medium mb-4", children: "Choose a Template" }), _jsx("div", { className: "flex justify-center", children: _jsx(TemplateSelector, { selectedTemplateId: selectedTemplateId, onTemplateSelect: handleTemplateSelect, children: _jsx(Card, { className: "w-80 cursor-pointer border-2 border-primary/20 hover:border-primary/40 transition-colors", children: _jsx(CardContent, { className: "p-4", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "text-2xl", children: getTemplateById(selectedTemplateId)?.icon || '⚡' }), _jsxs("div", { className: "flex-1 text-left", children: [_jsx("h4", { className: "font-medium", children: getTemplateById(selectedTemplateId)?.title }), _jsx("p", { className: "text-sm text-muted-foreground line-clamp-2", children: getTemplateById(selectedTemplateId)?.description })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Badge, { variant: "secondary", children: "Default" }), _jsx(ChevronDown, { className: "w-4 h-4 text-muted-foreground" })] })] }) }) }) }) }), _jsx("p", { className: "text-xs text-muted-foreground mt-2", children: "Click to browse all available templates" })] }), _jsx("div", { className: "mb-6", children: _jsxs(Button, { size: "lg", className: "px-8", onClick: handleCreateWithSelectedTemplate, children: [_jsx(Settings, { className: "w-4 h-4 mr-2" }), "Create App with ", getTemplateById(selectedTemplateId)?.title] }) }), _jsxs("div", { className: "grid gap-2", children: [_jsx("p", { className: "text-sm font-medium mb-2", children: "Or try these quick ideas:" }), quickPrompts.map((prompt, index) => (_jsxs(Button, { variant: "outline", size: "sm", className: "justify-start text-left", onClick: () => handleQuickPrompt(prompt.prompt), children: [prompt.icon, _jsx("span", { className: "ml-2", children: prompt.text })] }, index)))] })] }) })) : !currentConversation ? (_jsx("div", { className: "flex-1 flex items-center justify-center overflow-y-auto space-y-4", children: _jsxs("div", { className: "text-center max-w-md", children: [_jsx(Sparkles, { className: "w-16 h-16 text-primary mx-auto mb-4" }), _jsx("h2", { className: "text-2xl font-semibold mb-2", children: currentApp.name }), _jsx("p", { className: "text-muted-foreground mb-6", children: "Select a conversation from the sidebar or create a new one to continue working on this app." })] }) })) : (_jsxs("div", { className: "flex-1 overflow-y-auto space-y-4", children: [currentConversation?.messages?.map((message) => (_jsx(ChatMessage, { message: message }, message.id))), isStreamingResponse && streamingContent && (_jsxs("div", { className: "flex gap-3 justify-start", children: [_jsx("div", { className: "w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0", children: _jsx(Loader, { className: "w-4 h-4 text-primary-foreground animate-spin" }) }), _jsx("div", { className: "max-w-2xl mr-12", children: _jsx(Card, { children: _jsxs(CardContent, { className: "p-4", children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsx("span", { className: "text-sm font-medium", children: "Claude" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs opacity-70", children: "Streaming..." }), _jsxs("button", { onClick: handleStopGeneration, className: "text-xs text-red-500 hover:text-red-700 flex items-center gap-1", children: [_jsx(StopCircle, { className: "w-3 h-3" }), "Stop"] })] })] }), _jsx(EnhancedMarkdownRenderer, { content: streamingContent, isStreaming: true })] }) }) })] })), isGenerating && !isStreamingResponse && (_jsxs("div", { className: "flex items-center gap-2 text-muted-foreground", children: [_jsx("div", { className: "w-2 h-2 rounded-full bg-primary animate-pulse" }), _jsx("span", { children: "Prestige is thinking..." })] }))] })), error && (_jsx(Card, { className: "border-destructive", children: _jsx(CardContent, { className: "p-4", children: _jsx("p", { className: "text-destructive text-sm", children: error }) }) }))] }), _jsx("div", { className: "border-t p-4", children: _jsx(ChatInput, { value: input, onChange: setInput, onSend: handleSendMessage, disabled: isGenerating, placeholder: !currentApp
                                ? "Describe what you want to build..."
                                : !currentConversation
                                    ? "Start a new conversation..."
                                    : "Continue the conversation..." }) })] }), _jsx(ApiKeyDialog, { isOpen: apiKeyDialogOpen, onClose: () => setApiKeyDialogOpen(false) }), _jsx(CodeViewerPanel, {})] }));
}
