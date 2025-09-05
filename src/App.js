import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect } from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { TooltipProvider } from '@/components/ui/tooltip';
function App() {
    useEffect(() => {
        // Initialize prestige-ai folder on desktop
        const initializeServices = async () => {
            try {
                if (typeof window !== 'undefined' && window.electronAPI) {
                    await window.electronAPI.app.initializePrestigeFolder();
                }
            }
            catch (error) {
                console.error('Failed to initialize services:', error);
            }
        };
        initializeServices();
    }, []);
    return (_jsx(TooltipProvider, { children: _jsx("div", { className: "min-h-screen bg-background", children: _jsx(ChatInterface, {}) }) }));
}
export default App;
