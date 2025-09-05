import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Key, AlertCircle, CheckCircle } from 'lucide-react';
import { getApiKey, setApiKey, validateApiKey, checkClaudeCodeCLI } from '@/lib/apiKeys';
export function ApiKeyDialog({ isOpen, onClose }) {
    const [apiKeys, setApiKeys] = useState({
        anthropic: '',
        google: '',
    });
    const [showKeys, setShowKeys] = useState({
        anthropic: false,
        google: false,
    });
    const [validationStatus, setValidationStatus] = useState({
        anthropic: null,
        google: null,
    });
    const [claudeCodeStatus, setClaudeCodeStatus] = useState(null);
    const [isValidating, setIsValidating] = useState(false);
    useEffect(() => {
        if (isOpen) {
            // Load existing API keys
            const anthropicKey = getApiKey('anthropic');
            const googleKey = getApiKey('google');
            setApiKeys({
                anthropic: anthropicKey || '',
                google: googleKey || '',
            });
            // Check Claude Code CLI availability
            checkClaudeCodeCLI().then(setClaudeCodeStatus);
            // Validate existing keys
            if (anthropicKey)
                validateKey('anthropic', anthropicKey);
            if (googleKey)
                validateKey('google', googleKey);
        }
    }, [isOpen]);
    const validateKey = async (provider, key) => {
        if (!key.trim()) {
            setValidationStatus(prev => ({ ...prev, [provider]: null }));
            return;
        }
        setIsValidating(true);
        try {
            const isValid = await validateApiKey(provider, key);
            setValidationStatus(prev => ({ ...prev, [provider]: isValid }));
        }
        catch (error) {
            console.error(`Failed to validate ${provider} API key:`, error);
            setValidationStatus(prev => ({ ...prev, [provider]: false }));
        }
        finally {
            setIsValidating(false);
        }
    };
    const handleSaveKey = (provider) => {
        const key = apiKeys[provider];
        if (key.trim()) {
            setApiKey(provider, key);
            validateKey(provider, key);
        }
        else {
            // Remove key if empty
            setApiKey(provider, '');
            setValidationStatus(prev => ({ ...prev, [provider]: null }));
        }
    };
    const toggleShowKey = (provider) => {
        setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
    };
    const getStatusBadge = (provider) => {
        const status = validationStatus[provider];
        if (status === null) {
            return _jsx(Badge, { variant: "outline", children: "Not Set" });
        }
        return status ? (_jsxs(Badge, { className: "bg-green-100 text-green-700", children: [_jsx(CheckCircle, { className: "w-3 h-3 mr-1" }), "Valid"] })) : (_jsxs(Badge, { className: "bg-red-100 text-red-700", children: [_jsx(AlertCircle, { className: "w-3 h-3 mr-1" }), "Invalid"] }));
    };
    const providers = [
        {
            key: 'anthropic',
            name: 'Anthropic',
            description: 'Claude 3.5 Sonnet, Haiku, Opus models',
        },
        {
            key: 'google',
            name: 'Google AI',
            description: 'Gemini 1.5 Pro, Flash, 2.0 experimental models',
        },
    ];
    return (_jsx(Dialog, { open: isOpen, onOpenChange: onClose, children: _jsxs(DialogContent, { className: "sm:max-w-[500px]", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(Key, { className: "w-5 h-5" }), "API Key Management"] }) }), _jsxs("div", { className: "space-y-6 py-4", children: [providers.map(({ key, name, description }) => (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-sm font-medium", children: name }), _jsx("p", { className: "text-xs text-gray-500", children: description })] }), getStatusBadge(key)] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Input, { type: showKeys[key] ? 'text' : 'password', value: apiKeys[key], onChange: (e) => setApiKeys(prev => ({ ...prev, [key]: e.target.value })), placeholder: `Enter ${name} API key...`, className: "pr-10" }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", className: "absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0", onClick: () => toggleShowKey(key), children: showKeys[key] ? _jsx(EyeOff, { className: "w-4 h-4" }) : _jsx(Eye, { className: "w-4 h-4" }) })] }), _jsx(Button, { onClick: () => handleSaveKey(key), disabled: isValidating, size: "sm", children: "Save" })] })] }, key))), _jsxs("div", { className: "border-t pt-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-sm font-medium", children: "Claude Code CLI" }), _jsx("p", { className: "text-xs text-gray-500", children: "Standalone CLI for Claude models" })] }), claudeCodeStatus === null ? (_jsx(Badge, { variant: "outline", children: "Checking..." })) : claudeCodeStatus ? (_jsxs(Badge, { className: "bg-green-100 text-green-700", children: [_jsx(CheckCircle, { className: "w-3 h-3 mr-1" }), "Available"] })) : (_jsxs(Badge, { className: "bg-yellow-100 text-yellow-700", children: [_jsx(AlertCircle, { className: "w-3 h-3 mr-1" }), "Not Found"] }))] }), claudeCodeStatus === false && (_jsx("p", { className: "text-xs text-gray-500 mt-2", children: "Install Claude Code CLI to use Claude models without API keys" }))] })] }), _jsx("div", { className: "flex justify-end gap-2", children: _jsx(Button, { variant: "outline", onClick: onClose, children: "Close" }) })] }) }));
}
