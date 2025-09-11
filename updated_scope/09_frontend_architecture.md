# Frontend Architecture & Components

## Overview
CCDyad's frontend is built with React 18, TypeScript, and Tailwind CSS, featuring a modern component architecture with shadcn/ui components, state management via Zustand, and Electron-based desktop integration.

## Core Architecture

### 1. Application Structure (`/src/`)

**Main Application Entry:**
```typescript
// /src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
```

**App Component Structure:**
```typescript
// /src/App.tsx
import { Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { Layout } from '@/components/layout/Layout';
import { HomePage } from '@/pages/HomePage';
import { AppPage } from '@/pages/AppPage';
import { SettingsPage } from '@/pages/SettingsPage';

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/app/:id" element={<AppPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
      <Toaster />
    </div>
  );
}

export default App;
```

### 2. Component Organization

**Component Directory Structure:**
```
/src/components/
├── ui/                    # shadcn/ui base components
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   ├── toast.tsx
│   └── ...
├── layout/               # Layout components
│   ├── Layout.tsx
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── Navigation.tsx
├── app/                  # App-specific components
│   ├── AppCard.tsx
│   ├── AppList.tsx
│   ├── CreateAppDialog.tsx
│   └── AppStatusBadge.tsx
├── chat/                 # Chat interface components
│   ├── ChatContainer.tsx
│   ├── MessageList.tsx
│   ├── MessageInput.tsx
│   ├── MessageBubble.tsx
│   └── ChatHeader.tsx
├── preview_panel/        # App preview system
│   ├── PreviewIframe.tsx
│   ├── PreviewControls.tsx
│   ├── DeviceFrame.tsx
│   └── ComponentSelector.tsx
├── providers/            # AI provider components
│   ├── ProviderList.tsx
│   ├── ProviderCard.tsx
│   ├── AddProviderDialog.tsx
│   └── ProviderSettings.tsx
└── common/              # Shared components
    ├── LoadingSpinner.tsx
    ├── ErrorBoundary.tsx
    ├── ConfirmDialog.tsx
    └── FileUploader.tsx
```

## Layout System

### 1. Main Layout (`/src/components/layout/Layout.tsx`)

**Layout Component:**
```typescript
import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAppStore } from '@/stores/app-store';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { currentApp } = useAppStore();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={`
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-64' : 'w-16'}
        bg-sidebar border-r border-border
      `}>
        <Sidebar 
          isOpen={sidebarOpen} 
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Header 
          currentApp={currentApp}
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 2. Sidebar Navigation (`/src/components/layout/Sidebar.tsx`)

**Sidebar Component:**
```typescript
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/app-store';
import { 
  HomeIcon, 
  FolderIcon, 
  SettingsIcon, 
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon 
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { apps, currentApp } = useAppStore();

  const navigationItems = [
    { icon: HomeIcon, label: 'Home', path: '/' },
    { icon: SettingsIcon, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {isOpen && (
          <h1 className="text-lg font-semibold">CCDyad</h1>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="p-1"
        >
          {isOpen ? <ChevronLeftIcon size={16} /> : <ChevronRightIcon size={16} />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navigationItems.map((item) => (
          <Button
            key={item.path}
            variant={location.pathname === item.path ? "secondary" : "ghost"}
            className={`w-full justify-start ${!isOpen && 'px-2'}`}
            onClick={() => navigate(item.path)}
          >
            <item.icon size={16} />
            {isOpen && <span className="ml-2">{item.label}</span>}
          </Button>
        ))}

        {/* Apps Section */}
        <div className="pt-4">
          {isOpen && (
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Apps</h3>
              <Button variant="ghost" size="sm" className="p-1">
                <PlusIcon size={14} />
              </Button>
            </div>
          )}
          
          <div className="space-y-1">
            {apps.map((app) => (
              <Button
                key={app.id}
                variant={currentApp?.id === app.id ? "secondary" : "ghost"}
                className={`w-full justify-start ${!isOpen && 'px-2'}`}
                onClick={() => navigate(`/app/${app.id}`)}
              >
                <FolderIcon size={16} />
                {isOpen && <span className="ml-2 truncate">{app.name}</span>}
              </Button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
```

## State Management

### 1. App Store (`/src/stores/app-store.ts`)

**Zustand Store for App State:**
```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { IpcClient } from '@/ipc/ipc_client';

interface App {
  id: number;
  name: string;
  path: string;
  description?: string;
  framework: string;
  language: string;
  status: 'created' | 'running' | 'stopped' | 'error';
  githubUrl?: string;
  vercelUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface AppStore {
  // State
  apps: App[];
  currentApp: App | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadApps: () => Promise<void>;
  createApp: (appData: Partial<App>) => Promise<App>;
  updateApp: (id: number, updates: Partial<App>) => Promise<void>;
  deleteApp: (id: number) => Promise<void>;
  setCurrentApp: (app: App | null) => void;
  runApp: (id: number) => Promise<{ port?: number; error?: string }>;
  stopApp: (id: number) => Promise<void>;
}

export const useAppStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    apps: [],
    currentApp: null,
    loading: false,
    error: null,

    // Load apps from database
    loadApps: async () => {
      set({ loading: true, error: null });
      try {
        const ipcClient = IpcClient.getInstance();
        const apps = await ipcClient.listApps();
        set({ apps, loading: false });
      } catch (error) {
        set({ 
          error: `Failed to load apps: ${error.message}`, 
          loading: false 
        });
      }
    },

    // Create new app
    createApp: async (appData) => {
      set({ loading: true, error: null });
      try {
        const ipcClient = IpcClient.getInstance();
        const newApp = await ipcClient.createApp(appData);
        
        set((state) => ({
          apps: [...state.apps, newApp],
          currentApp: newApp,
          loading: false,
        }));
        
        return newApp;
      } catch (error) {
        set({ 
          error: `Failed to create app: ${error.message}`, 
          loading: false 
        });
        throw error;
      }
    },

    // Update existing app
    updateApp: async (id, updates) => {
      try {
        const ipcClient = IpcClient.getInstance();
        await ipcClient.updateApp(id, updates);
        
        set((state) => ({
          apps: state.apps.map(app => 
            app.id === id ? { ...app, ...updates } : app
          ),
          currentApp: state.currentApp?.id === id 
            ? { ...state.currentApp, ...updates } 
            : state.currentApp,
        }));
      } catch (error) {
        set({ error: `Failed to update app: ${error.message}` });
        throw error;
      }
    },

    // Delete app
    deleteApp: async (id) => {
      try {
        const ipcClient = IpcClient.getInstance();
        await ipcClient.deleteApp(id);
        
        set((state) => ({
          apps: state.apps.filter(app => app.id !== id),
          currentApp: state.currentApp?.id === id ? null : state.currentApp,
        }));
      } catch (error) {
        set({ error: `Failed to delete app: ${error.message}` });
        throw error;
      }
    },

    // Set current active app
    setCurrentApp: (app) => {
      set({ currentApp: app });
    },

    // Run app development server
    runApp: async (id) => {
      try {
        const ipcClient = IpcClient.getInstance();
        const result = await ipcClient.executeApp(id);
        
        if (result.success) {
          // Update app status
          await get().updateApp(id, { status: 'running' });
        }
        
        return result;
      } catch (error) {
        await get().updateApp(id, { status: 'error' });
        throw error;
      }
    },

    // Stop app development server
    stopApp: async (id) => {
      try {
        const ipcClient = IpcClient.getInstance();
        await ipcClient.stopApp(id);
        await get().updateApp(id, { status: 'stopped' });
      } catch (error) {
        set({ error: `Failed to stop app: ${error.message}` });
        throw error;
      }
    },
  }))
);
```

### 2. Chat Store (`/src/stores/chat-store.ts`)

**Chat State Management:**
```typescript
import { create } from 'zustand';
import { IpcClient } from '@/ipc/ipc_client';

interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: any;
  attachments?: string[];
}

interface Chat {
  id: number;
  appId: number;
  title: string;
  mode: 'build' | 'ask' | 'fix';
  provider: string;
  model: string;
  messages: Message[];
  isActive: boolean;
}

interface ChatStore {
  // State
  chats: Chat[];
  currentChat: Chat | null;
  isStreaming: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  loadChats: (appId: number) => Promise<void>;
  createChat: (appId: number, chatData: Partial<Chat>) => Promise<Chat>;
  sendMessage: (content: string, attachments?: File[]) => Promise<void>;
  setCurrentChat: (chat: Chat | null) => void;
  updateMessage: (messageId: number, updates: Partial<Message>) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [],
  currentChat: null,
  isStreaming: false,
  loading: false,
  error: null,

  loadChats: async (appId) => {
    set({ loading: true, error: null });
    try {
      const ipcClient = IpcClient.getInstance();
      const chats = await ipcClient.getAppChats(appId);
      set({ chats, loading: false });
    } catch (error) {
      set({ error: `Failed to load chats: ${error.message}`, loading: false });
    }
  },

  createChat: async (appId, chatData) => {
    try {
      const ipcClient = IpcClient.getInstance();
      const newChat = await ipcClient.createChat({
        appId,
        ...chatData,
      });
      
      set((state) => ({
        chats: [...state.chats, newChat],
        currentChat: newChat,
      }));
      
      return newChat;
    } catch (error) {
      set({ error: `Failed to create chat: ${error.message}` });
      throw error;
    }
  },

  sendMessage: async (content, attachments) => {
    const { currentChat } = get();
    if (!currentChat) return;

    set({ isStreaming: true, error: null });

    try {
      const ipcClient = IpcClient.getInstance();
      
      // Add user message immediately
      const userMessage: Message = {
        id: Date.now(), // Temporary ID
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
        attachments: attachments?.map(f => f.name),
      };

      set((state) => ({
        currentChat: state.currentChat ? {
          ...state.currentChat,
          messages: [...state.currentChat.messages, userMessage],
        } : null,
      }));

      // Send message via IPC
      await ipcClient.sendChatMessage({
        chatId: currentChat.id,
        content,
        attachments,
      });

    } catch (error) {
      set({ 
        error: `Failed to send message: ${error.message}`,
        isStreaming: false,
      });
    }
  },

  setCurrentChat: (chat) => {
    set({ currentChat: chat });
  },

  updateMessage: (messageId, updates) => {
    set((state) => ({
      currentChat: state.currentChat ? {
        ...state.currentChat,
        messages: state.currentChat.messages.map(msg =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ),
      } : null,
    }));
  },
}));
```

## UI Components

### 1. App Components (`/src/components/app/`)

**App Card Component:**
```typescript
// /src/components/app/AppCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayIcon, StopIcon, EditIcon, TrashIcon } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';

interface AppCardProps {
  app: App;
  onEdit?: (app: App) => void;
  onDelete?: (app: App) => void;
}

export function AppCard({ app, onEdit, onDelete }: AppCardProps) {
  const { runApp, stopApp } = useAppStore();
  const [loading, setLoading] = useState(false);

  const handleRunStop = async () => {
    setLoading(true);
    try {
      if (app.status === 'running') {
        await stopApp(app.id);
      } else {
        const result = await runApp(app.id);
        if (result.error) {
          // Handle error
          console.error('Failed to run app:', result.error);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'stopped': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{app.name}</CardTitle>
          <Badge 
            variant="secondary"
            className={`${getStatusColor(app.status)} text-white`}
          >
            {app.status}
          </Badge>
        </div>
        {app.description && (
          <p className="text-sm text-muted-foreground">{app.description}</p>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{app.framework}</Badge>
            <Badge variant="outline">{app.language}</Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={app.status === 'running' ? 'destructive' : 'default'}
              onClick={handleRunStop}
              disabled={loading}
            >
              {app.status === 'running' ? (
                <StopIcon size={16} />
              ) : (
                <PlayIcon size={16} />
              )}
            </Button>
            
            {onEdit && (
              <Button size="sm" variant="outline" onClick={() => onEdit(app)}>
                <EditIcon size={16} />
              </Button>
            )}
            
            {onDelete && (
              <Button size="sm" variant="outline" onClick={() => onDelete(app)}>
                <TrashIcon size={16} />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 2. Chat Components (`/src/components/chat/`)

**Message Bubble Component:**
```typescript
// /src/components/chat/MessageBubble.tsx
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CopyIcon, RefreshIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  onCopy?: (content: string) => void;
  onRetry?: (messageId: number) => void;
}

export function MessageBubble({ message, onCopy, onRetry }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex gap-3 mb-4",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <Avatar className="w-8 h-8">
        <AvatarFallback>
          {isUser ? 'U' : 'AI'}
        </AvatarFallback>
      </Avatar>

      <div className={cn(
        "flex flex-col gap-1 max-w-[80%]",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "rounded-lg px-3 py-2 text-sm",
          isUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted"
        )}>
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
          
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {message.attachments.map((attachment, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {attachment}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
          </span>
          
          <div className="flex gap-1">
            {onCopy && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => onCopy(message.content)}
              >
                <CopyIcon size={12} />
              </Button>
            )}
            
            {!isUser && onRetry && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => onRetry(message.id)}
              >
                <RefreshIcon size={12} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 3. Preview Components (`/src/components/preview_panel/`)

**Device Frame Component:**
```typescript
// /src/components/preview_panel/DeviceFrame.tsx
import { cn } from '@/lib/utils';

interface DeviceFrameProps {
  children: React.ReactNode;
  device: 'desktop' | 'tablet' | 'mobile';
  className?: string;
}

export function DeviceFrame({ children, device, className }: DeviceFrameProps) {
  const frameStyles = {
    desktop: {
      width: '100%',
      height: '100%',
      maxWidth: 'none',
    },
    tablet: {
      width: '768px',
      height: '1024px',
      maxWidth: '90%',
    },
    mobile: {
      width: '375px',
      height: '667px',
      maxWidth: '90%',
    },
  };

  const currentStyle = frameStyles[device];

  return (
    <div className={cn(
      "relative mx-auto bg-white rounded-lg shadow-lg overflow-hidden",
      device !== 'desktop' && "border-8 border-gray-800",
      className
    )}>
      {device === 'mobile' && (
        <>
          {/* Mobile notch */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-xl z-10" />
          {/* Home indicator */}
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gray-800 rounded-full z-10" />
        </>
      )}
      
      <div 
        className="w-full h-full"
        style={currentStyle}
      >
        {children}
      </div>
    </div>
  );
}
```

## Routing and Navigation

### 1. Router Configuration

**React Router Setup:**
```typescript
// /src/router/index.tsx
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { HomePage } from '@/pages/HomePage';
import { AppPage } from '@/pages/AppPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ErrorPage } from '@/pages/ErrorPage';

const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'app/:id',
        element: <AppPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```

### 2. Page Components

**App Page Component:**
```typescript
// /src/pages/AppPage.tsx
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useChatStore } from '@/stores/chat-store';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { PreviewPanel } from '@/components/preview_panel/PreviewPanel';
import { AppHeader } from '@/components/app/AppHeader';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

export function AppPage() {
  const { id } = useParams<{ id: string }>();
  const { apps, setCurrentApp } = useAppStore();
  const { loadChats } = useChatStore();
  const [app, setApp] = useState<App | null>(null);

  useEffect(() => {
    if (id) {
      const appId = parseInt(id, 10);
      const foundApp = apps.find(a => a.id === appId);
      
      if (foundApp) {
        setApp(foundApp);
        setCurrentApp(foundApp);
        loadChats(appId);
      }
    }
  }, [id, apps, setCurrentApp, loadChats]);

  if (!app) {
    return <div>App not found</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <AppHeader app={app} />
      
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={50} minSize={30}>
          <ChatContainer appId={app.id} />
        </ResizablePanel>
        
        <ResizableHandle />
        
        <ResizablePanel defaultSize={50} minSize={30}>
          <PreviewPanel app={app} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
```

## Styling and Theme

### 1. Tailwind Configuration (`/tailwind.config.js`)

**Tailwind CSS Setup:**
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

### 2. CSS Variables (`/src/index.css`)

**Theme Variables:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 84% 4.9%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 94.1%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

## Error Handling

### 1. Error Boundary (`/src/components/common/ErrorBoundary.tsx`)

**React Error Boundary:**
```typescript
import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangleIcon } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <AlertTriangleIcon className="w-16 h-16 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4 text-center max-w-md">
            An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
          </p>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Refresh Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Related Files

- **Main App**: `/src/App.tsx`
- **Entry Point**: `/src/main.tsx`
- **Layout Components**: `/src/components/layout/`
- **UI Components**: `/src/components/ui/`
- **App Store**: `/src/stores/app-store.ts`
- **Chat Store**: `/src/stores/chat-store.ts`
- **Styling**: `/src/index.css`
- **Tailwind Config**: `/tailwind.config.js`
- **Component Library**: `/components.json`