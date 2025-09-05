import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { ClaudeCodeService } from '@/services/claudeCodeService';
export function ClaudeStatus({ onStatusChange }) {
    const [status, setStatus] = useState('checking');
    const resetTime = '6pm';
    const checkStatus = async () => {
        setStatus('checking');
        try {
            const claudeService = ClaudeCodeService.getInstance();
            const isAvailable = await claudeService.checkAvailability();
            if (isAvailable) {
                setStatus('available');
                onStatusChange?.(true);
            }
            else {
                setStatus('unavailable');
                onStatusChange?.(false);
            }
        }
        catch (error) {
            setStatus('unavailable');
            onStatusChange?.(false);
        }
    };
    useEffect(() => {
        checkStatus();
    }, []);
    if (status === 'checking') {
        return (_jsx(Card, { className: "border-blue-200 bg-blue-50", children: _jsx(CardContent, { className: "p-3", children: _jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx(RefreshCw, { className: "w-4 h-4 animate-spin" }), _jsx("span", { children: "Checking Claude Code status..." })] }) }) }));
    }
    if (status === 'available') {
        return (_jsx(Card, { className: "border-green-200 bg-green-50", children: _jsx(CardContent, { className: "p-3", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm text-green-700", children: [_jsx("div", { className: "w-2 h-2 rounded-full bg-green-500" }), _jsx("span", { children: "Claude Code CLI Ready" })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: checkStatus, className: "h-6 px-2 text-xs", children: _jsx(RefreshCw, { className: "w-3 h-3" }) })] }) }) }));
    }
    if (status === 'limited') {
        return (_jsx(Card, { className: "border-orange-200 bg-orange-50", children: _jsx(CardContent, { className: "p-3", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx(Clock, { className: "w-4 h-4 text-orange-600 mt-0.5" }), _jsxs("div", { className: "flex-1 text-sm", children: [_jsx("p", { className: "text-orange-800 font-medium", children: "Usage Limit Reached" }), _jsxs("p", { className: "text-orange-700 text-xs mt-1", children: ["Claude Code CLI usage limit reached. Resets around ", resetTime, "."] }), _jsx("p", { className: "text-orange-600 text-xs mt-1", children: "The app will automatically use simulation mode for now." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: checkStatus, className: "h-6 px-2 text-xs", children: _jsx(RefreshCw, { className: "w-3 h-3" }) })] }) }) }));
    }
    return (_jsx(Card, { className: "border-red-200 bg-red-50", children: _jsx(CardContent, { className: "p-3", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx(AlertCircle, { className: "w-4 h-4 text-red-600 mt-0.5" }), _jsxs("div", { className: "flex-1 text-sm", children: [_jsx("p", { className: "text-red-800 font-medium", children: "Claude Code CLI Unavailable" }), _jsxs("p", { className: "text-red-700 text-xs mt-1", children: ["Install with: ", _jsx("code", { className: "bg-red-100 px-1 rounded", children: "npm install -g @anthropic/claude" })] }), _jsx("p", { className: "text-red-600 text-xs mt-1", children: "Using simulation mode for development." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: checkStatus, className: "h-6 px-2 text-xs", children: _jsx(RefreshCw, { className: "w-3 h-3" }) })] }) }) }));
}
