import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Check, ChevronDown, Key, Terminal, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger, } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { modelProviders } from '@/lib/models';
import { useAiderStore } from '@/stores/aiderStore';
import { useApiKeyStore, getModelAvailability } from '@/lib/apiKeys';
export function EnhancedModelPicker({ selectedModel, onModelSelect, onApiKeyDialogOpen, className, showStatus = true }) {
    const [open, setOpen] = useState(false);
    const { getProviderStatus, checkClaudeCodeCli, cliStatus } = useApiKeyStore();
    useEffect(() => {
        // Check Claude Code CLI availability on mount
        checkClaudeCodeCli();
    }, [checkClaudeCodeCli]);
    const getStatusIcon = (model) => {
        const availability = getModelAvailability(model.name, model.provider);
        if (model.name === 'claude-code') {
            const anthropicStatus = getProviderStatus('anthropic');
            const hasApiKey = anthropicStatus.hasKey && anthropicStatus.isValid;
            const hasCli = cliStatus.claudeCodeAvailable;
            const hasUsageLimit = cliStatus.hasUsageLimit;
            if (hasApiKey) {
                return _jsx(CheckCircle, { className: "h-3 w-3 text-green-500" });
            }
            else if (hasCli && !hasUsageLimit) {
                return _jsx(Terminal, { className: "h-3 w-3 text-blue-500" });
            }
            else if (hasCli && hasUsageLimit) {
                return _jsx(AlertCircle, { className: "h-3 w-3 text-orange-500" });
            }
            else {
                return _jsx(AlertCircle, { className: "h-3 w-3 text-orange-500" });
            }
        }
        if (model.name === 'aider-cli') {
            // Treat as ready if IPC available
            if (typeof window !== 'undefined' && window.electronAPI?.aider) {
                return _jsx(Terminal, { className: "h-3 w-3 text-blue-500" });
            }
            else {
                return _jsx(AlertCircle, { className: "h-3 w-3 text-orange-500" });
            }
        }
        switch (availability.status) {
            case 'ready':
                return _jsx(CheckCircle, { className: "h-3 w-3 text-green-500" });
            case 'needs-setup':
                return _jsx(Key, { className: "h-3 w-3 text-orange-500" });
            default:
                return _jsx(AlertCircle, { className: "h-3 w-3 text-red-500" });
        }
    };
    const getStatusBadge = (model) => {
        const availability = getModelAvailability(model.name, model.provider);
        if (model.name === 'claude-code') {
            const anthropicStatus = getProviderStatus('anthropic');
            const hasApiKey = anthropicStatus.hasKey && anthropicStatus.isValid;
            const hasCli = cliStatus.claudeCodeAvailable;
            const hasUsageLimit = cliStatus.hasUsageLimit;
            // Debug: Log the status to console
            console.log('Claude Code Status Debug:', {
                hasApiKey,
                hasCli,
                hasUsageLimit,
                cliStatus,
                anthropicStatus
            });
            if (hasApiKey) {
                return _jsx(Badge, { variant: "outline", className: "text-green-600 border-green-200", children: "API Ready" });
            }
            else if (hasCli && !hasUsageLimit) {
                return _jsx(Badge, { variant: "outline", className: "text-blue-600 border-blue-200", children: "CLI Ready" });
            }
            else if (hasCli && hasUsageLimit) {
                return _jsx(Badge, { variant: "outline", className: "text-orange-600 border-orange-200", children: "Usage Limited" });
            }
            else {
                return _jsx(Badge, { variant: "outline", className: "text-orange-600 border-orange-200", children: "Setup Needed" });
            }
        }
        if (model.name === 'aider-cli') {
            if (typeof window !== 'undefined' && window.electronAPI?.aider) {
                return _jsx(Badge, { variant: "outline", className: "text-blue-600 border-blue-200", children: "CLI Ready" });
            }
            return _jsx(Badge, { variant: "outline", className: "text-orange-600 border-orange-200", children: "Install Needed" });
        }
        switch (availability.status) {
            case 'ready':
                return _jsx(Badge, { variant: "outline", className: "text-green-600 border-green-200", children: "Ready" });
            case 'needs-setup':
                return _jsx(Badge, { variant: "outline", className: "text-orange-600 border-orange-200", children: "API Key Needed" });
            default:
                return _jsx(Badge, { variant: "outline", className: "text-red-600 border-red-200", children: "Error" });
        }
    };
    const getHeaderStatus = () => {
        if (selectedModel.name === 'claude-code') {
            const anthropicStatus = getProviderStatus('anthropic');
            const hasApiKey = anthropicStatus.hasKey && anthropicStatus.isValid;
            const hasCli = cliStatus.claudeCodeAvailable;
            const hasUsageLimit = cliStatus.hasUsageLimit;
            if (hasApiKey) {
                return { icon: _jsx(CheckCircle, { className: "h-4 w-4 text-green-500" }), text: "API Ready" };
            }
            else if (hasCli && !hasUsageLimit) {
                return { icon: _jsx(Terminal, { className: "h-4 w-4 text-blue-500" }), text: "CLI Ready" };
            }
            else if (hasCli && hasUsageLimit) {
                return { icon: _jsx(AlertCircle, { className: "h-4 w-4 text-orange-500" }), text: "Usage Limited" };
            }
            else {
                return { icon: _jsx(AlertCircle, { className: "h-4 w-4 text-orange-500" }), text: "Setup Needed" };
            }
        }
        const availability = getModelAvailability(selectedModel.name, selectedModel.provider);
        if (selectedModel.name === 'aider-cli') {
            if (typeof window !== 'undefined' && window.electronAPI?.aider) {
                return { icon: _jsx(Terminal, { className: "h-4 w-4 text-blue-500" }), text: 'CLI Ready' };
            }
            return { icon: _jsx(AlertCircle, { className: "h-4 w-4 text-orange-500" }), text: 'Install Aider' };
        }
        switch (availability.status) {
            case 'ready':
                return { icon: _jsx(CheckCircle, { className: "h-4 w-4 text-green-500" }), text: "Ready" };
            case 'needs-setup':
                return { icon: _jsx(Key, { className: "h-4 w-4 text-orange-500" }), text: "API Key Needed" };
            default:
                return { icon: _jsx(AlertCircle, { className: "h-4 w-4 text-red-500" }), text: "Error" };
        }
    };
    const handleApiKeySetup = () => {
        onApiKeyDialogOpen?.();
        setOpen(false);
    };
    const handleModelSelect = (model) => {
        onModelSelect(model);
        setOpen(false);
    };
    const headerStatus = getHeaderStatus();
    // Aider backend selection state
    const { backendProvider, model: aiderModel, setBackend } = useAiderStore();
    const anthropicStatus = getProviderStatus('anthropic');
    const openaiStatus = getProviderStatus('openai');
    const googleStatus = getProviderStatus('google');
    const aiderBackends = [
        { id: 'anthropic', label: 'Claude (sonnet)', model: 'sonnet', status: anthropicStatus },
        { id: 'openai', label: 'OpenAI (o3-mini)', model: 'o3-mini', status: openaiStatus },
        { id: 'gemini', label: 'Gemini (gemini)', model: 'gemini', status: googleStatus },
    ];
    const renderAiderBackendSelector = () => {
        if (selectedModel.name !== 'aider-cli')
            return null;
        return (_jsxs("div", { className: "p-3 border-t space-y-2 bg-muted/30", children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-wide text-muted-foreground", children: "Aider Backend" }), _jsx("div", { className: "flex flex-col gap-1", children: aiderBackends.map(b => {
                        const enabled = b.status.hasKey && b.status.isValid;
                        const active = backendProvider === b.id;
                        return (_jsxs("button", { disabled: !enabled, onClick: () => setBackend(b.id, b.model), className: cn('text-left px-2 py-1 rounded border text-xs flex items-center justify-between', enabled ? 'cursor-pointer hover:bg-accent' : 'opacity-50 cursor-not-allowed', active && 'bg-accent border-primary'), children: [_jsx("span", { children: b.label }), _jsxs("span", { className: "flex items-center gap-1", children: [!enabled && _jsx(Key, { className: "h-3 w-3 text-orange-500" }), active && _jsx(Check, { className: "h-3 w-3 text-green-500" })] })] }, b.id));
                    }) }), _jsx("div", { className: "text-[10px] text-muted-foreground leading-snug", children: "Select which provider Aider will invoke. Each option requires its API key configured. If none selected, fixes will not run via Aider." })] }));
    };
    return (_jsx("div", { className: "flex items-center gap-2", children: _jsxs(Popover, { open: open, onOpenChange: setOpen, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", role: "combobox", "aria-expanded": open, className: cn("w-[300px] justify-between", className), children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-lg", children: modelProviders.find(p => p.id === selectedModel.provider)?.icon }), _jsx("span", { className: "truncate", children: selectedModel.name }), showStatus && headerStatus.icon] }), _jsx(ChevronDown, { className: "ml-2 h-4 w-4 shrink-0 opacity-50" })] }) }), _jsxs(PopoverContent, { className: "w-[400px] p-0", children: [_jsxs(Command, { children: [_jsx(CommandInput, { placeholder: "Search models..." }), _jsxs(CommandList, { children: [_jsx(CommandEmpty, { children: "No models found." }), modelProviders.map((provider) => (_jsxs(CommandGroup, { heading: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { children: provider.icon }), _jsx("span", { children: provider.name })] }), _jsx("div", { className: "flex items-center gap-2", children: provider.apiKeyRequired && (_jsxs(Button, { variant: "ghost", size: "sm", onClick: handleApiKeySetup, className: "text-xs h-6 px-2", children: [_jsx(Settings, { className: "h-3 w-3 mr-1" }), "Setup"] })) })] }), children: [provider.models.map((model) => {
                                                    const isSelected = selectedModel.name === model.name && selectedModel.provider === model.provider;
                                                    return (_jsxs(CommandItem, { value: `${model.provider}-${model.name}`, onSelect: () => handleModelSelect(model), className: "flex items-center justify-between p-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Check, { className: cn("h-4 w-4", isSelected ? "opacity-100" : "opacity-0") }), _jsxs("div", { className: "flex flex-col", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-medium", children: model.name }), model.requiresCli && _jsx(Terminal, { className: "h-3 w-3 text-blue-500" })] }), _jsx("span", { className: "text-xs text-muted-foreground", children: model.description }), model.cost && (_jsx("span", { className: "text-xs text-muted-foreground font-mono", children: model.cost })), model.contextWindow && (_jsxs("span", { className: "text-xs text-muted-foreground", children: ["Context: ", model.contextWindow.toLocaleString(), " tokens"] }))] })] }), _jsxs("div", { className: "flex flex-col items-end gap-1", children: [getStatusIcon(model), showStatus && getStatusBadge(model)] })] }, `${model.provider}-${model.name}`));
                                                }), provider.id !== modelProviders[modelProviders.length - 1].id && _jsx(Separator, { className: "my-2" })] }, provider.id)))] })] }), renderAiderBackendSelector()] })] }) }));
}
