import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
export function ChatInput({ value, onChange, onSend, disabled, placeholder }) {
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    const handleSend = () => {
        if (value.trim() && !disabled) {
            onSend(value.trim());
        }
    };
    return (_jsxs("div", { className: "flex gap-2 items-end", children: [_jsx("div", { className: "flex-1 relative", children: _jsx("textarea", { value: value, onChange: (e) => onChange(e.target.value), onKeyPress: handleKeyPress, placeholder: placeholder, disabled: disabled, rows: 1, className: "w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", style: {
                        minHeight: '40px',
                        maxHeight: '120px',
                        height: 'auto',
                        overflow: 'hidden',
                    }, onInput: (e) => {
                        const target = e.target;
                        target.style.height = 'auto';
                        target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                    } }) }), _jsx(Button, { onClick: handleSend, disabled: !value.trim() || disabled, size: "icon", children: _jsx(Send, { className: "w-4 h-4" }) })] }));
}
