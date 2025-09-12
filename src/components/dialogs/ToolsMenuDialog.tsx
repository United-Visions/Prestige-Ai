import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Github, 
  Database, 
  Globe, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Plus,
  ExternalLink,
  GitBranch,
  Users
} from 'lucide-react';
import { GitHubService } from '@/services/githubService';
import { SupabaseService } from '@/services/supabaseService';
import { VercelService } from '@/services/vercelService';
import { IntegrationSetupDialog } from './IntegrationSetupDialog';
import { CreateRepoDialog } from './CreateRepoDialog';

interface ToolsMenuDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentApp?: { name: string; path: string } | null;
}

interface ConnectionStatus {
  github: {
    connected: boolean;
    user?: any;
    loading: boolean;
  };
  supabase: {
    connected: boolean;
    projects?: any[];
    loading: boolean;
  };
  vercel: {
    connected: boolean;
    user?: any;
    projects?: any[];
    loading: boolean;
  };
}

export function ToolsMenuDialog({ isOpen, onClose, currentApp }: ToolsMenuDialogProps) {
  const [activeTab, setActiveTab] = useState<'connections' | 'actions'>('connections');
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [createRepoDialogOpen, setCreateRepoDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'github' | 'supabase' | 'vercel'>('github');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    github: { connected: false, loading: true },
    supabase: { connected: false, loading: true },
    vercel: { connected: false, loading: true },
  });

  // Check connection status on mount
  useEffect(() => {
    if (isOpen) {
      checkConnectionStatus();
    }
  }, [isOpen]);

  const checkConnectionStatus = async () => {
    // Check GitHub connection
    try {
      const githubService = GitHubService.getInstance();
      if (githubService.isAuthenticated()) {
        const user = await githubService.getUser();
        setConnectionStatus(prev => ({
          ...prev,
          github: { connected: true, user, loading: false }
        }));
      } else {
        setConnectionStatus(prev => ({
          ...prev,
          github: { connected: false, loading: false }
        }));
      }
    } catch (error) {
      setConnectionStatus(prev => ({
        ...prev,
        github: { connected: false, loading: false }
      }));
    }

    // Check Supabase connection
    try {
      const supabaseService = SupabaseService.getInstance();
      if (supabaseService.isAuthenticated()) {
        const projects = await supabaseService.getProjects();
        setConnectionStatus(prev => ({
          ...prev,
          supabase: { connected: true, projects, loading: false }
        }));
      } else {
        setConnectionStatus(prev => ({
          ...prev,
          supabase: { connected: false, loading: false }
        }));
      }
    } catch (error) {
      setConnectionStatus(prev => ({
        ...prev,
        supabase: { connected: false, loading: false }
      }));
    }

    // Check Vercel connection
    try {
      const vercelService = VercelService.getInstance();
      if (vercelService.isAuthenticated()) {
        const [user, projects] = await Promise.all([
          vercelService.getUser(),
          vercelService.getProjects()
        ]);
        setConnectionStatus(prev => ({
          ...prev,
          vercel: { connected: true, user, projects, loading: false }
        }));
      } else {
        setConnectionStatus(prev => ({
          ...prev,
          vercel: { connected: false, loading: false }
        }));
      }
    } catch (error) {
      setConnectionStatus(prev => ({
        ...prev,
        vercel: { connected: false, loading: false }
      }));
    }
  };

  const handleConnect = (provider: 'github' | 'supabase' | 'vercel') => {
    setSelectedProvider(provider);
    setSetupDialogOpen(true);
  };

  const handleDisconnect = async (provider: 'github' | 'supabase' | 'vercel') => {
    try {
      switch (provider) {
        case 'github':
          GitHubService.getInstance().logout();
          break;
        case 'supabase':
          SupabaseService.getInstance().logout();
          break;
        case 'vercel':
          VercelService.getInstance().logout();
          break;
      }
      // Refresh connection status
      checkConnectionStatus();
    } catch (error) {
      console.error(`Failed to disconnect from ${provider}:`, error);
    }
  };

  const handleSetupSuccess = () => {
    setSetupDialogOpen(false);
    // Refresh connection status after successful setup
    setTimeout(() => {
      checkConnectionStatus();
    }, 1000);
  };

  const handleCreateRepo = () => {
    if (connectionStatus.github.connected) {
      setCreateRepoDialogOpen(true);
    } else {
      handleConnect('github');
    }
  };

  const renderConnectionCard = (
    provider: 'github' | 'supabase' | 'vercel',
    icon: React.ElementType,
    name: string,
    description: string,
    color: string
  ) => {
    const status = connectionStatus[provider];
    const Icon = icon;

    return (
      <div className={`border rounded-lg p-4 ${color}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/80">
              <Icon className="w-6 h-6 text-gray-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{name}</h3>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {status.loading ? (
              <Badge variant="secondary">Checking...</Badge>
            ) : status.connected ? (
              <Badge className="bg-green-100 text-green-800 border-green-300">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">
                <AlertCircle className="w-3 h-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
        </div>

        {status.connected && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            {provider === 'github' && status.user && (
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <p className="font-medium">{status.user.name || status.user.username}</p>
                  <p className="text-gray-500">{status.user.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect('github')}
                >
                  Disconnect
                </Button>
              </div>
            )}
            
            {provider === 'supabase' && status.projects && (
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <p className="font-medium">{status.projects.length} projects available</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect('supabase')}
                >
                  Disconnect
                </Button>
              </div>
            )}
            
            {provider === 'vercel' && status.user && (
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <p className="font-medium">{status.user.name || status.user.username}</p>
                  <p className="text-gray-500">{status.projects?.length || 0} projects</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect('vercel')}
                >
                  Disconnect
                </Button>
              </div>
            )}
          </div>
        )}

        {!status.connected && !status.loading && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <Button
              size="sm"
              className="w-full"
              onClick={() => handleConnect(provider)}
            >
              <Icon className="w-4 h-4 mr-2" />
              Connect {name}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderActionsTab = () => (
    <div className="space-y-4">
      {currentApp ? (
        <>
          <Alert className="border-blue-200 bg-blue-50">
            <Settings className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="font-semibold">Active Project: {currentApp.name}</div>
              <p className="text-sm mt-1">Deploy and manage your current application.</p>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 gap-3">
            <Button
              onClick={handleCreateRepo}
              className="justify-start h-auto p-4"
              variant="outline"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100">
                  <GitBranch className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Create GitHub Repository</div>
                  <div className="text-sm text-gray-600">
                    {connectionStatus.github.connected 
                      ? "Create a new repo and sync your current app"
                      : "Connect GitHub first to create repositories"}
                  </div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 ml-auto" />
            </Button>

            <Button
              className="justify-start h-auto p-4"
              variant="outline"
              disabled={!connectionStatus.supabase.connected}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Database className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Create Supabase Project</div>
                  <div className="text-sm text-gray-600">
                    {connectionStatus.supabase.connected
                      ? "Set up database and backend for your app"
                      : "Connect Supabase first to create projects"}
                  </div>
                </div>
              </div>
            </Button>

            <Button
              className="justify-start h-auto p-4"
              variant="outline"
              disabled={!connectionStatus.vercel.connected}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-black">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Deploy to Vercel</div>
                  <div className="text-sm text-gray-600">
                    {connectionStatus.vercel.connected
                      ? "Deploy your app to production"
                      : "Connect Vercel first to deploy"}
                  </div>
                </div>
              </div>
            </Button>
          </div>
        </>
      ) : (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <div className="font-semibold">No Active Project</div>
            <p className="text-sm mt-1">
              Create or select an app to access deployment and management actions.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Settings className="w-6 h-6" />
              Developer Tools & Integrations
            </DialogTitle>
            <DialogDescription>
              Connect your development accounts and manage project integrations
            </DialogDescription>
          </DialogHeader>

          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('connections')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'connections'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Account Connections
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'actions'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Project Actions
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === 'connections' ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Connect your accounts to enable seamless development workflow with version control, 
                  backend services, and deployment automation.
                </div>
                
                {renderConnectionCard(
                  'github',
                  Github,
                  'GitHub',
                  'Version control and repository management',
                  'border-gray-300 bg-gray-50'
                )}
                
                {renderConnectionCard(
                  'supabase',
                  Database,
                  'Supabase',
                  'Authentication, database, and backend services',
                  'border-green-300 bg-green-50'
                )}
                
                {renderConnectionCard(
                  'vercel',
                  Globe,
                  'Vercel',
                  'Deployment and hosting platform',
                  'border-black bg-gray-50'
                )}
              </div>
            ) : (
              renderActionsTab()
            )}
          </div>
        </DialogContent>
      </Dialog>

      <IntegrationSetupDialog
        isOpen={setupDialogOpen}
        onClose={() => setSetupDialogOpen(false)}
        provider={selectedProvider}
        onSuccess={handleSetupSuccess}
      />

      <CreateRepoDialog
        isOpen={createRepoDialogOpen}
        onClose={() => setCreateRepoDialogOpen(false)}
        currentApp={currentApp}
        onSuccess={() => {
          setCreateRepoDialogOpen(false);
          checkConnectionStatus();
        }}
      />
    </>
  );
}