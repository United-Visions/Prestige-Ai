import useAppStore from '@/stores/appStore';
import { useAIStore } from '@/store/aiStore';
import useCodeViewerStore from '@/stores/codeViewerStore';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, MessageSquare, ArrowLeft, Play } from 'lucide-react';

export function AppSidebar() {
  const { 
    apps, 
    currentApp, 
    currentAppConversations,
    currentConversation,
    setCurrentApp, 
    setCurrentConversation,
    deleteApp, 
    createConversation 
  } = useAppStore();

  const {
    setPreviewApp,
    setPreviewVisible
  } = useAIStore();

  const { showPreviewMode } = useCodeViewerStore();

  const handleNewConversation = () => {
    if (currentApp) {
      createConversation(currentApp.id, 'New conversation');
    }
  };

  const handleCreateNewApp = () => {
    setCurrentApp(null);
  };

  const handleBackToApps = () => {
    setCurrentApp(null);
    setCurrentConversation(null);
  };

  const handlePreviewApp = (app: any) => {
    setPreviewApp(app);
    setPreviewVisible(true);
    showPreviewMode();
  };

  // Show conversations when an app is selected
  if (currentApp && currentAppConversations.length >= 0) {
    return (
      <div className="w-64 border-r bg-card text-card-foreground flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBackToApps} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-sm font-semibold">{currentApp.name}</h2>
              <p className="text-xs text-muted-foreground">Conversations</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {currentAppConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-3 cursor-pointer border-b ${
                currentConversation?.id === conversation.id ? 'bg-primary/10' : 'hover:bg-muted'
              }`}
              onClick={() => setCurrentConversation(conversation)}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conversation.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(conversation.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t">
          <Button onClick={handleNewConversation} className="w-full">
            <PlusCircle className="w-4 h-4 mr-2" />
            New Conversation
          </Button>
        </div>
      </div>
    );
  }

  // Show apps list when no app is selected
  return (
    <div className="w-64 border-r bg-card text-card-foreground flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">My Apps</h2>
        <Button variant="ghost" size="icon" onClick={handleCreateNewApp} className="h-8 w-8">
          <PlusCircle className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {apps.map((app) => (
          <div
            key={app.id}
            className={`p-3 cursor-pointer ${
              currentApp?.id === app.id ? 'bg-primary/10' : 'hover:bg-muted'
            }`}
            onClick={() => setCurrentApp(app)}
          >
            <div className="flex justify-between items-center">
              <span className="font-medium">{app.name}</span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreviewApp(app);
                  }}
                  title="Preview App"
                >
                  <Play className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteApp(app.id);
                  }}
                  title="Delete App"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t">
        <Button onClick={handleCreateNewApp} className="w-full">
          <PlusCircle className="w-4 h-4 mr-2" />
          Create New App
        </Button>
      </div>
    </div>
  );
}
