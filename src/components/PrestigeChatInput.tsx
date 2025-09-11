import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, 
  Mic, 
  Paperclip, 
  Sparkles,
  Zap
} from 'lucide-react';

interface PrestigeChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function PrestigeChatInput({ 
  value, 
  onChange, 
  onSend, 
  disabled, 
  placeholder 
}: PrestigeChatInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSend(value);
      }
    }
  };

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend(value);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  return (
    <div className="p-6 border-t bg-gradient-to-r from-background via-background to-background/95 backdrop-blur-xl">
      <div className="max-w-4xl mx-auto">
        {/* Input Container */}
        <div className={`relative rounded-2xl border-2 transition-all duration-300 ${
          isFocused 
            ? 'border-primary/40 shadow-glow bg-card' 
            : 'border-border hover:border-primary/20 bg-card/80'
        }`}>
          
          {/* Main Input Area */}
          <div className="flex items-end gap-3 p-4">
            {/* Attachment Button */}
            <Button
              variant="ghost"
              size="sm"
              className="w-9 h-9 p-0 rounded-lg hover:bg-muted/80 flex-shrink-0"
              disabled={disabled}
            >
              <Paperclip className="w-4 h-4 text-muted-foreground" />
            </Button>

            {/* Text Input */}
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder || "Ask Prestige AI anything..."}
                disabled={disabled}
                className="min-h-[44px] max-h-[120px] resize-none border-0 bg-transparent p-0 text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 custom-scrollbar"
                style={{ fontSize: '16px' }} // Prevent zoom on iOS
              />
              
              {/* Enhanced Placeholder */}
              {!value && !isFocused && (
                <div className="absolute left-0 top-3 text-muted-foreground pointer-events-none flex items-center gap-2">
                  <Sparkles className="w-4 h-4 opacity-50" />
                  <span className="text-base">{placeholder || "Ask Prestige AI anything..."}</span>
                </div>
              )}
            </div>

            {/* Voice Input Button */}
            <Button
              variant="ghost"
              size="sm"
              className="w-9 h-9 p-0 rounded-lg hover:bg-muted/80 flex-shrink-0"
              disabled={disabled}
            >
              <Mic className="w-4 h-4 text-muted-foreground" />
            </Button>

            {/* Send Button */}
            <Button
              onClick={handleSend}
              disabled={disabled || !value.trim()}
              size="sm"
              className="w-10 h-10 p-0 rounded-lg bg-gradient-primary hover:opacity-90 text-white shadow-md hover:shadow-lg transition-all duration-200 flex-shrink-0 group"
            >
              <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
            </Button>
          </div>

          {/* Bottom Bar */}
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span>AI Enhanced</span>
              </div>
              <span>Press Enter to send, Shift+Enter for new line</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${disabled ? 'bg-muted' : 'bg-success animate-pulse'}`} />
              <span>{disabled ? 'Processing' : 'Ready'}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {!disabled && !value && (
          <div className="flex justify-center gap-2 mt-4 animate-fade-in">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs rounded-full bg-card/80 border-border/50 hover:border-primary/30"
              onClick={() => onChange("Help me create a new component")}
            >
              ✨ Create Component
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs rounded-full bg-card/80 border-border/50 hover:border-primary/30"
              onClick={() => onChange("Review and optimize my code")}
            >
              🔍 Review Code
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs rounded-full bg-card/80 border-border/50 hover:border-primary/30"
              onClick={() => onChange("Add new features to this app")}
            >
              🚀 Add Features
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}