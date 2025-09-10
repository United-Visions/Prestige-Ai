import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EnhancedModelPicker } from '@/components/EnhancedModelPicker';
import { useTheme } from '@/components/theme-provider';
import { 
  Sparkles, 
  Play, 
  Moon, 
  Sun, 
  Settings, 
  Zap,
  Crown,
  Gem
} from 'lucide-react';

interface PrestigeBrandHeaderProps {
  currentApp?: { name: string } | null;
  selectedModel: any;
  setSelectedModel: (model: any) => void;
  onApiKeyDialogOpen: () => void;
  onPreviewApp?: () => void;
}

export function PrestigeBrandHeader({ 
  currentApp, 
  selectedModel, 
  setSelectedModel, 
  onApiKeyDialogOpen, 
  onPreviewApp 
}: PrestigeBrandHeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="border-b bg-gradient-to-r from-background via-background to-background/95 backdrop-blur-xl">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Brand Section */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {/* Prestige Logo */}
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg animate-glow-pulse">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                  <Gem className="w-2 h-2 text-accent-foreground" />
                </div>
              </div>
              
              {/* Brand Text */}
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold prestige-gradient-text flex items-center gap-2">
                  Prestige
                  <span className="text-base font-normal text-muted-foreground">AI</span>
                </h1>
                <p className="text-xs text-muted-foreground font-medium">
                  Elite Development Platform
                </p>
              </div>
            </div>
            
            {/* Current App Indicator */}
            {currentApp && (
              <div className="flex items-center gap-2 ml-4">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <div className="flex flex-col">
                  <Badge variant="secondary" className="text-xs font-medium">
                    {currentApp.name}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Active Project</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Actions Section */}
          <div className="flex items-center gap-3">
            {/* Model Picker */}
            <EnhancedModelPicker 
              selectedModel={selectedModel}
              onModelSelect={setSelectedModel}
              onApiKeyDialogOpen={onApiKeyDialogOpen}
            />
            
            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-9 h-9 p-0"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
            
            {/* Preview Button */}
            {currentApp && onPreviewApp && (
              <Button
                size="sm"
                variant="default"
                onClick={onPreviewApp}
                className="bg-gradient-primary hover:opacity-90 text-white font-medium shadow-lg"
              >
                <Play className="w-4 h-4 mr-2" />
                Preview
              </Button>
            )}
            
            {/* Settings */}
            <Button
              variant="outline"
              size="sm"
              className="w-9 h-9 p-0"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Status Bar */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-muted-foreground">System Ready</span>
            </div>
            {currentApp && (
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-accent" />
                <span className="text-muted-foreground">Development Mode</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">v2.0.0</span>
            <Badge variant="outline" className="text-xs">
              Pro
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}