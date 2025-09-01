import { useEffect } from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import useAppStore from '@/stores/appStore';
import { ClaudeCodeService } from '@/services/claudeCodeService';
import { TooltipProvider } from '@/components/ui/tooltip';

function App() {
  const { setAvailableModels, setError } = useAppStore();

  useEffect(() => {
    // Initialize Claude Code service and check availability
    const initializeServices = async () => {
      try {
        // Initialize prestige-ai folder on desktop
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
          await (window as any).electronAPI.app.initializePrestigeFolder();
        }

        const claudeService = ClaudeCodeService.getInstance();
        const isAvailable = await claudeService.checkAvailability();
        
        // Update model availability
        setAvailableModels([
          {
            id: 'claude-code',
            name: 'Claude Code Max',
            description: 'Premium AI assistant with advanced code understanding and tool access',
            type: 'cli',
            isAvailable,
          },
        ]);

        if (!isAvailable) {
          console.warn('Claude Code CLI is not available. Some features may be limited.');
        }
      } catch (error) {
        console.error('Failed to initialize services:', error);
        setError('Failed to initialize Claude Code service');
      }
    };

    initializeServices();
  }, [setAvailableModels, setError]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <ChatInterface />
      </div>
    </TooltipProvider>
  );
}

export default App;