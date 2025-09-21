import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EnhancedModelPicker } from '@/components/EnhancedModelPicker';
import { useTheme } from '@/components/theme-provider';
import { ToolsMenuDialog } from '@/components/dialogs/ToolsMenuDialog';
import { resolveAppPaths } from '@/utils/appPathResolver';
import {
  Sparkles,
  Play,
  Moon,
  Sun,
  Settings,
  Zap,
  Crown,
  Gem,
  Wrench,
  Code2
} from 'lucide-react';

interface PrestigeBrandHeaderProps {
  currentApp?: { name: string } | null;
  selectedModel: any;
  setSelectedModel: (model: any) => void;
  onApiKeyDialogOpen: () => void;
  onModelPreferencesOpen?: () => void;
  onPreviewApp?: () => void;
}

export function PrestigeBrandHeader({ 
  currentApp, 
  selectedModel, 
  setSelectedModel, 
  onApiKeyDialogOpen,
  onModelPreferencesOpen,
  onPreviewApp 
}: PrestigeBrandHeaderProps) {
  const { theme, setTheme } = useTheme();
  const [toolsMenuOpen, setToolsMenuOpen] = React.useState(false);
  const [dbStatus, setDbStatus] = React.useState<null | { provider?: string; mode?: string }>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function loadDb() {
      try {
        if (!currentApp) { setDbStatus(null); return; }
        const appLike: any = { name: currentApp.name, path: currentApp.name };
        const { filesPath } = await resolveAppPaths(appLike);
        const p = await (window as any).electronAPI.path.join(filesPath, '.prestige', 'integrations.json');
        const raw = await (window as any).electronAPI.fs.readFile(p, 'utf8');
        const json = JSON.parse(raw || '{}');
        if (!cancelled) {
          setDbStatus(json?.database || null);
        }
      } catch {
        if (!cancelled) setDbStatus(null);
      }
    }
    loadDb();
    return () => { cancelled = true; };
  }, [currentApp?.name]);

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
                  {dbStatus?.provider && (
                    <div className="mt-1">
                      <Badge variant="outline" className="text-[10px]">
                        DB: {dbStatus.provider}{dbStatus.mode ? ` (${dbStatus.mode})` : ''}
                      </Badge>
                    </div>
                  )}
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
            
            {/* Model Preferences Button */}
            {onModelPreferencesOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={onModelPreferencesOpen}
                className="h-9 px-3"
                title="Model Preferences"
              >
                <Settings className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Preferences</span>
              </Button>
            )}
            
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
            
            {/* Codebase Button */}
            {currentApp && onPreviewApp && (
              <Button
                size="sm"
                variant="default"
                onClick={onPreviewApp}
                className="bg-gradient-primary hover:opacity-90 text-white font-medium shadow-lg"
              >
                <Code2 className="w-4 h-4 mr-2" />
                Codebase
              </Button>
            )}
            
            {/* Developer Tools */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setToolsMenuOpen(true)}
              className="w-9 h-9 p-0"
              title="Developer Tools & Integrations"
            >
              <Wrench className="w-4 h-4" />
            </Button>
            
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

      {/* Tools Menu Dialog */}
      <ToolsMenuDialog
        isOpen={toolsMenuOpen}
        onClose={() => setToolsMenuOpen(false)}
        currentApp={currentApp}
      />
    </div>
  );
}