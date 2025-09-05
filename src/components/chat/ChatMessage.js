import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatTimestamp } from '@/lib/utils';
import { User, Bot, FileText, Download } from 'lucide-react';
import { EnhancedMarkdownRenderer } from './EnhancedMarkdownRenderer';
export function ChatMessage({ message }) {
    const isUser = message.role === 'user';
    const handleDownloadFile = (filename, content) => {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };
    return (_jsxs("div", { className: `flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`, children: [!isUser && (_jsx("div", { className: "w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0", children: _jsx(Bot, { className: "w-4 h-4 text-primary-foreground" }) })), _jsx("div", { className: `max-w-2xl ${isUser ? 'ml-12' : 'mr-12'}`, children: _jsx(Card, { className: isUser ? 'bg-primary text-primary-foreground' : '', children: _jsxs(CardContent, { className: "p-4", children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsx("span", { className: "text-sm font-medium", children: isUser ? 'You' : 'Claude' }), _jsx("span", { className: "text-xs opacity-70", children: formatTimestamp(message.createdAt) })] }), _jsx("div", { className: "whitespace-pre-wrap", children: isUser ? message.content : _jsx(EnhancedMarkdownRenderer, { content: message.content, isStreaming: false }) }), message.fileChanges && Array.isArray(message.fileChanges) && message.fileChanges.length > 0 && (_jsxs("div", { className: "mt-4 space-y-2", children: [_jsxs("div", { className: "text-sm font-medium flex items-center gap-2", children: [_jsx(FileText, { className: "w-4 h-4" }), "Generated Files (", message.fileChanges.length, ")"] }), message.fileChanges.map((file, index) => (_jsxs("div", { className: "bg-muted rounded-lg p-3 border", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "font-mono text-sm", children: file.path }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs bg-primary/10 text-primary px-2 py-1 rounded", children: file.action }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => handleDownloadFile(file.path, file.content), children: _jsx(Download, { className: "w-3 h-3" }) })] })] }), file.content && (_jsx("pre", { className: "text-xs bg-background p-2 rounded border overflow-x-auto", children: _jsxs("code", { children: [file.content.slice(0, 500), file.content.length > 500 ? '...' : ''] }) }))] }, index)))] }))] }) }) }), isUser && (_jsx("div", { className: "w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0", children: _jsx(User, { className: "w-4 h-4" }) }))] }));
}
