import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useApiKeyStore } from '@/lib/apiKeys';
import { supportsThinking } from '@/utils/thinking';
class AIModelService {
    constructor() { }
    static getInstance() {
        if (!AIModelService.instance) {
            AIModelService.instance = new AIModelService();
        }
        return AIModelService.instance;
    }
    async generateResponse(model, systemPrompt, messages) {
        switch (model.provider) {
            case 'anthropic':
                return this.generateAnthropicResponse(model, systemPrompt, messages);
            case 'google':
                return this.generateGoogleResponse(model, systemPrompt, messages);
            default:
                throw new Error(`Unsupported model provider: ${model.provider}`);
        }
    }
    async streamResponse(model, systemPrompt, messages, options = {}) {
        const { onChunk, onComplete, onError, settings } = options;
        try {
            switch (model.provider) {
                case 'anthropic':
                    await this.streamAnthropicResponse(model, systemPrompt, messages, { onChunk, onComplete, onError, settings });
                    break;
                case 'google':
                    await this.streamGoogleResponse(model, systemPrompt, messages, { onChunk, onComplete, onError, settings });
                    break;
                default:
                    throw new Error(`Streaming not supported for provider: ${model.provider}`);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            onError?.(errorMessage);
        }
    }
    async generateAnthropicResponse(model, systemPrompt, messages) {
        const apiKey = useApiKeyStore.getState().getApiKey('anthropic');
        if (!apiKey) {
            throw new Error('Anthropic API key not found.');
        }
        const anthropic = new Anthropic({ apiKey });
        const response = await anthropic.messages.create({
            model: model.name,
            system: systemPrompt,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            max_tokens: model.maxOutputTokens || 4096,
        });
        return response.content
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join('');
    }
    async streamAnthropicResponse(model, systemPrompt, messages, options) {
        const { onChunk, onComplete, onError } = options;
        const apiKey = useApiKeyStore.getState().getApiKey('anthropic');
        if (!apiKey) {
            throw new Error('Anthropic API key not found.');
        }
        const anthropic = new Anthropic({ apiKey });
        let fullResponse = '';
        let fullThinkingContent = '';
        try {
            const stream = await anthropic.messages.create({
                model: model.name,
                system: systemPrompt,
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                max_tokens: model.maxOutputTokens || 4096,
                stream: true,
            });
            for await (const chunk of stream) {
                if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                    const content = chunk.delta.text;
                    // For Anthropic, we need to manually parse thinking tags since they don't have native thinking mode yet
                    if (content.includes('<think>')) {
                        // Extract thinking content and regular content
                        const thinkMatch = content.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
                        if (thinkMatch) {
                            fullThinkingContent += thinkMatch[1];
                            onChunk?.({ type: 'reasoning', content: thinkMatch[1] });
                            // Also check for content after </think>
                            const afterThink = content.split('</think>')[1];
                            if (afterThink) {
                                fullResponse += afterThink;
                                onChunk?.({ type: 'text-delta', content: afterThink });
                            }
                        }
                    }
                    else if (content.includes('</think>')) {
                        // End of thinking block
                        const parts = content.split('</think>');
                        if (parts[0]) {
                            fullThinkingContent += parts[0];
                            onChunk?.({ type: 'reasoning', content: parts[0] });
                        }
                        if (parts[1]) {
                            fullResponse += parts[1];
                            onChunk?.({ type: 'text-delta', content: parts[1] });
                        }
                    }
                    else {
                        // Regular content - check if we're in a thinking block
                        const isInThinkingBlock = fullThinkingContent && !content.includes('</think>');
                        if (isInThinkingBlock && content.trim()) {
                            fullThinkingContent += content;
                            onChunk?.({ type: 'reasoning', content });
                        }
                        else {
                            fullResponse += content;
                            onChunk?.({ type: 'text-delta', content });
                        }
                    }
                }
            }
            // Combine thinking and response content for final response
            const combinedResponse = fullThinkingContent
                ? `<think>${fullThinkingContent}</think>\n\n${fullResponse}`
                : fullResponse;
            onComplete?.(combinedResponse);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            onError?.(errorMessage);
        }
    }
    async generateGoogleResponse(model, systemPrompt, messages) {
        const apiKey = useApiKeyStore.getState().getApiKey('google');
        if (!apiKey) {
            throw new Error('Google API key not found.');
        }
        const genAI = new GoogleGenerativeAI(apiKey);
        const geminiModel = genAI.getGenerativeModel({ model: model.name });
        const chat = geminiModel.startChat({
            history: []
        });
        // Convert messages to Gemini format and include system prompt
        const sanitizedSystemPrompt = this.sanitizeSystemPromptForGoogle(systemPrompt);
        const systemMessage = `${sanitizedSystemPrompt.parts[0].text}\n\n---\n\n`;
        let result;
        for (const message of messages) {
            if (message.role === 'user') {
                // Combine system prompt with the first user message
                const messageContent = result ? message.content : `${systemMessage}${message.content}`;
                result = await chat.sendMessage(messageContent);
            }
        }
        if (!result) {
            throw new Error('No response from Google AI');
        }
        return result.response.text();
    }
    sanitizeSystemPromptForGoogle(systemPrompt) {
        // Google Gemini API can be sensitive to system prompts
        // Clean up the prompt and simplify it
        let sanitized = systemPrompt
            // Remove XML-like tags
            .replace(/<[^>]*>/g, '')
            // Remove multiple newlines
            .replace(/\n{3,}/g, '\n\n')
            // Remove excessive whitespace
            .replace(/[ \t]+/g, ' ')
            // Trim whitespace
            .trim();
        // Use a simplified, reliable system prompt for Google
        sanitized = `You are Prestige AI, an AI assistant that helps users create and modify web applications. You provide clear, helpful responses about React, TypeScript, and web development.`;
        // Return in a simple format
        return {
            parts: [{ text: sanitized }]
        };
    }
    async streamGoogleResponse(model, systemPrompt, messages, options) {
        const { onChunk, onComplete, onError, settings } = options;
        const apiKey = useApiKeyStore.getState().getApiKey('google');
        if (!apiKey) {
            throw new Error('Google API key not found.');
        }
        // Retry configuration
        const maxRetries = 2;
        let lastError = null;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const genAI = new GoogleGenerativeAI(apiKey);
                // Configure generation settings
                const generationConfig = {
                    maxOutputTokens: model.maxOutputTokens || 4096,
                    temperature: 0,
                };
                // Add thinking configuration for Gemini 2.5 models if supported
                if (supportsThinking(model.provider) && model.name.includes('2.5')) {
                    generationConfig.thinkingConfig = {
                        includeThoughts: true,
                        thinkingBudget: settings?.thinkingBudget || -1, // -1 for dynamic thinking
                    };
                }
                const geminiModel = genAI.getGenerativeModel({
                    model: model.name,
                    generationConfig,
                    systemInstruction: systemPrompt
                });
                let fullResponse = '';
                // Attempt the API call
                // Convert messages to Gemini format
                const chatHistory = messages.slice(0, -1).map(msg => ({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                }));
                // Get the last user message
                const lastUserMessage = messages.filter(m => m.role === 'user').pop();
                if (!lastUserMessage) {
                    throw new Error('No user message found in conversation');
                }
                const chat = geminiModel.startChat({
                    history: chatHistory
                });
                const result = await chat.sendMessageStream(lastUserMessage.content);
                for await (const chunk of result.stream) {
                    // Handle thinking content if available
                    if (chunk.candidates?.[0]?.content?.parts) {
                        for (const part of chunk.candidates[0].content.parts) {
                            // For now, treat all content as regular text since the Google SDK might not expose thinking parts yet
                            const content = part.text || '';
                            fullResponse += content;
                            onChunk?.({
                                type: 'text-delta',
                                content
                            });
                        }
                    }
                    else {
                        // Fallback for models without thinking support
                        const chunkText = chunk.text();
                        fullResponse += chunkText;
                        onChunk?.({ type: 'text-delta', content: chunkText });
                    }
                }
                // For now, return just the response since thinking is not fully implemented for Google yet
                onComplete?.(fullResponse);
                return; // Success, exit retry loop
            }
            catch (error) {
                lastError = error;
                // Check if it's a retryable error
                const isRetryable = this.isRetryableError(error);
                if (!isRetryable || attempt === maxRetries) {
                    // Don't retry or we've exhausted retries
                    const errorMessage = this.formatGoogleError(error);
                    onError?.(errorMessage);
                    return;
                }
                // Wait before retrying (exponential backoff)
                const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
                console.log(`Google API attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        // If we get here, all retries failed
        if (lastError) {
            const errorMessage = this.formatGoogleError(lastError);
            onError?.(errorMessage);
        }
    }
    isRetryableError(error) {
        if (!error)
            return false;
        // Check for HTTP status codes that indicate temporary issues
        const errorString = String(error);
        const isInternalServerError = errorString.includes('500') || errorString.includes('Internal Server Error');
        const isServiceUnavailable = errorString.includes('503') || errorString.includes('Service Unavailable');
        const isTimeout = errorString.includes('timeout') || errorString.includes('TIMEOUT');
        const isNetworkError = errorString.includes('network') || errorString.includes('NETWORK');
        const isFetchFailed = errorString.includes('Fetch failed loading');
        return isInternalServerError || isServiceUnavailable || isTimeout || isNetworkError || isFetchFailed;
    }
    formatGoogleError(error) {
        if (!error)
            return 'Unknown error occurred';
        const errorString = String(error);
        const errorMessage = error instanceof Error ? error.message : errorString;
        // Check for specific error types and provide user-friendly messages
        if (errorString.includes('500') || errorString.includes('Internal Server Error')) {
            return 'The Google AI service is temporarily experiencing issues. This usually resolves quickly. Please try again in a moment.';
        }
        if (errorString.includes('503') || errorString.includes('Service Unavailable')) {
            return 'The Google AI service is currently unavailable. Please try again in a few minutes.';
        }
        if (errorString.includes('401') || errorString.includes('Unauthorized')) {
            return 'Invalid API key. Please check your Google AI API key in settings.';
        }
        if (errorString.includes('403') || errorString.includes('Forbidden')) {
            return 'Access denied. Please check your Google AI API key permissions or quota limits.';
        }
        if (errorString.includes('429') || errorString.includes('Too Many Requests')) {
            return 'Rate limit exceeded. Please wait a moment before trying again.';
        }
        if (errorString.includes('timeout') || errorString.includes('TIMEOUT')) {
            return 'Request timed out. Please try again.';
        }
        if (errorString.includes('Fetch failed loading')) {
            return 'Network error occurred. Please check your internet connection and try again.';
        }
        // Return the original error message for other cases
        return errorMessage;
    }
}
export const aiModelService = AIModelService.getInstance();
