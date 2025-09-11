import { useEffect } from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';

function App() {
  useEffect(() => {
    // Initialize prestige-ai folder on desktop
    const initializeServices = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
          await (window as any).electronAPI.app.initializePrestigeFolder();
        }
      } catch (error) {
        console.error('Failed to initialize services:', error);
      }
    };

    initializeServices();
  }, []);

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