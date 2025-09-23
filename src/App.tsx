import { useEffect } from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import useAppStore from '@/stores/appStore';

function App() {
  const { checkIntegrationStatuses } = useAppStore();

  useEffect(() => {
    // Initialize prestige-ai folder and load stored tokens
    const initializeServices = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
          await (window as any).electronAPI.app.initializePrestigeFolder();
        }
        
        // Load stored integration tokens
        await checkIntegrationStatuses();
      } catch (error) {
        console.error('Failed to initialize services:', error);
      }
    };

    initializeServices();
  }, [checkIntegrationStatuses]);

  return (
    <ThemeProvider defaultTheme="light" storageKey="prestige-ui-theme">
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <ChatInterface />
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;