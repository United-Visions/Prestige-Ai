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
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Users,
  Rocket,
  Zap,
  Link,
  Clock,
  Cpu,
  Activity,
  Eye,
  EyeOff,
  Edit,
  Save,
  ChevronDown,
  ChevronUp,
  Key
} from 'lucide-react';
import { GitHubService } from '@/services/githubService';
import { SupabaseService } from '@/services/supabaseService';
import { VercelService } from '@/services/vercelService';
import { gitService } from '@/services/gitService';
import { environmentSyncService } from '@/services/environmentSyncService';
import { deploymentStatusService } from '@/services/deploymentStatusService';
import { IntegrationSetupDialog } from './IntegrationSetupDialog';
import { CreateRepoDialog } from './CreateRepoDialog';
import { showSuccess, showError, showInfo } from '@/utils/toast';

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
    activeDeployments?: number;
    lastDeployment?: {
      url: string;
      status: string;
      createdAt: number;
    };
  };
}

// Environment Variable Row Component
const EnvironmentVariableRow: React.FC<{
  envVar: {key: string, value: string, type?: string},
  onUpdate: (newValue: string) => void
}> = ({ envVar, onUpdate }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [tempValue, setTempValue] = React.useState(envVar.value);
  const [showValue, setShowValue] = React.useState(false);
  const isSecret = envVar.type === 'secret';

  const handleSave = () => {
    if (tempValue !== envVar.value) {
      onUpdate(tempValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue(envVar.value);
    setIsEditing(false);
  };

  const isPlaceholder = tempValue.includes('your_') || tempValue.includes('_here') || tempValue.includes('example.com');

  return (
    <div className="flex items-center gap-2 p-2 bg-white rounded border border-amber-200">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono font-medium text-gray-700">
            {envVar.key}
          </span>
          {isSecret && (
            <Badge variant="secondary" className="text-xs px-1 py-0">
              Secret
            </Badge>
          )}
          {isPlaceholder && (
            <Badge variant="outline" className="text-xs px-1 py-0 text-amber-600 border-amber-300">
              Placeholder
            </Badge>
          )}
        </div>
        
        {isEditing ? (
          <Input
            type={isSecret && !showValue ? "password" : "text"}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            className="text-xs font-mono h-8"
            placeholder="Enter value..."
          />
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-600 break-all">
              {isSecret && !showValue ? '••••••••••••••••' : envVar.value}
            </span>
            {isSecret && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowValue(!showValue)}
                className="h-6 w-6 p-0"
              >
                {showValue ? (
                  <EyeOff className="w-3 h-3" />
                ) : (
                  <Eye className="w-3 h-3" />
                )}
              </Button>
            )}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        {isEditing ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className="h-8 w-8 p-0"
            >
              <Save className="w-3 h-3 text-green-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8 w-8 p-0"
            >
              <ChevronUp className="w-3 h-3 text-gray-500" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-8 w-8 p-0"
          >
            <Edit className="w-3 h-3 text-blue-600" />
          </Button>
        )}
      </div>
    </div>
  );
};

export function ToolsMenuDialog({ isOpen, onClose, currentApp }: ToolsMenuDialogProps) {
  const [activeTab, setActiveTab] = useState<'connections' | 'actions'>('connections');
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [createRepoDialogOpen, setCreateRepoDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'github' | 'supabase' | 'vercel' | 'mongodb'>('github');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    github: { connected: false, loading: true },
    supabase: { connected: false, loading: true },
    vercel: { connected: false, loading: true },
  });
  const [repositoryInfo, setRepositoryInfo] = useState<{
    isGitRepo: boolean;
    githubRepo?: { owner: string; name: string; url: string };
    loading: boolean;
  }>({ isGitRepo: false, loading: true });
  const [deploymentLoading, setDeploymentLoading] = useState(false);
  const [envSyncLoading, setEnvSyncLoading] = useState(false);
  const [envVars, setEnvVars] = useState<Array<{key: string, value: string, type?: string}>>([]);
  const [envVarsLoading, setEnvVarsLoading] = useState(false);
  const [envVarsExpanded, setEnvVarsExpanded] = useState(false);

  // Check connection status on mount
  useEffect(() => {
    if (isOpen) {
      checkConnectionStatus();
      checkRepositoryStatus();
      loadEnvironmentVariables();
    }
  }, [isOpen, currentApp]);

  const checkConnectionStatus = async () => {
    // Check GitHub connection
    try {
      const githubService = GitHubService.getInstance();
      const isAuthenticated = await githubService.isAuthenticated();
      if (isAuthenticated) {
        const user = await githubService.getUser();
        if (user) {
          setConnectionStatus(prev => ({
            ...prev,
            github: { connected: true, user, loading: false }
          }));
        } else {
          // If we can't get user info, the token is likely invalid
          setConnectionStatus(prev => ({
            ...prev,
            github: { connected: false, loading: false }
          }));
        }
      } else {
        setConnectionStatus(prev => ({
          ...prev,
          github: { connected: false, loading: false }
        }));
      }
    } catch (error) {
      console.error('Error checking GitHub connection:', error);
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

  const handleConnect = (provider: 'github' | 'supabase' | 'vercel' | 'mongodb') => {
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
          await VercelService.getInstance().logout();
          break;
      }
      // Refresh connection status
      checkConnectionStatus();
    } catch (error) {
      console.error(`Failed to disconnect from ${provider}:`, error);
    }
  };

  const checkRepositoryStatus = async () => {
    if (!currentApp) {
      setRepositoryInfo({ isGitRepo: false, loading: false });
      return;
    }

    try {
      // Get app directory path
      let appPath = currentApp.path;
      if (!appPath) {
        const desktop = await window.electronAPI.app.getDesktopPath();
        appPath = await window.electronAPI.path.join(desktop, 'prestige-ai', currentApp.name);
      }

      const repoInfo = await gitService.getRepositoryInfo(appPath);
      setRepositoryInfo({
        isGitRepo: repoInfo.isGitRepo,
        githubRepo: repoInfo.githubRepo,
        loading: false
      });
    } catch (error) {
      console.error('Failed to check repository status:', error);
      setRepositoryInfo({ isGitRepo: false, loading: false });
    }
  };

  const handleSetupSuccess = () => {
    setSetupDialogOpen(false);
    // Refresh connection status after successful setup
    setTimeout(() => {
      checkConnectionStatus();
      checkRepositoryStatus();
    }, 1000);
  };

  const handleCreateRepo = () => {
    if (connectionStatus.github.connected) {
      setCreateRepoDialogOpen(true);
    } else {
      handleConnect('github');
    }
  };

  const handleDeployToVercel = async () => {
    if (!currentApp) return;
    
    console.log('🚀 Deploy to Vercel started', { currentApp, repositoryInfo, connectionStatus });
    
    setDeploymentLoading(true);
    try {
      if (!connectionStatus.github.connected) {
        showError('GitHub connection required for deployment');
        return;
      }
      
      if (!connectionStatus.vercel.connected) {
        showError('Vercel connection required for deployment');
        return;
      }
      
      if (!repositoryInfo.githubRepo) {
        showError('GitHub repository required. Create a repository first.');
        return;
      }
      
      showInfo('🚀 Setting up deployment pipeline...');
      
      const vercelService = VercelService.getInstance();
      console.log('📡 Calling vercelService.connectGitHubRepo', {
        appId: 1,
        repoUrl: repositoryInfo.githubRepo.url,
        appName: currentApp.name
      });
      
      const result = await vercelService.connectGitHubRepo(
        1, // TODO: get actual app ID
        repositoryInfo.githubRepo.url,
        currentApp.name
      );
      
      console.log('📊 Vercel deployment result:', result);
      
      if (result.success) {
        showSuccess('✅ Deployment pipeline created successfully!');
        if (result.deploymentUrl) {
          showInfo(`🌐 Your app will be available at: ${result.deploymentUrl}`);
        }
        
        // Refresh status to show new deployment info
        setTimeout(() => checkConnectionStatus(), 2000);
      } else {
        showError(`Deployment setup failed: ${result.error}`);
      }
    } catch (error) {
      console.error('🔥 Deployment error:', error);
      showError(`Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeploymentLoading(false);
    }
  };

  const handleSyncEnvironmentVars = async () => {
    if (!currentApp) return;
    
    setEnvSyncLoading(true);
    try {
      // Get app path
      let appPath = currentApp.path;
      if (!appPath) {
        const desktop = await window.electronAPI.app.getDesktopPath();
        appPath = await window.electronAPI.path.join(desktop, 'prestige-ai', currentApp.name);
      }
      
      // Find Vercel project for this app
      const projects = connectionStatus.vercel.projects || [];
      const appProject = projects.find(p => p.name === currentApp.name || p.name.includes(currentApp.name));
      
      if (!appProject) {
        showError('No Vercel project found. Deploy to Vercel first.');
        return;
      }
      
      await environmentSyncService.syncToVercel(appPath, appProject.id);
    } catch (error) {
      showError(`Environment sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setEnvSyncLoading(false);
    }
  };

  const loadEnvironmentVariables = async () => {
    if (!currentApp) return;
    
    setEnvVarsLoading(true);
    try {
      // Get app path
      let appPath = currentApp.path;
      if (!appPath) {
        const desktop = await window.electronAPI.app.getDesktopPath();
        appPath = await window.electronAPI.path.join(desktop, 'prestige-ai', currentApp.name, 'files');
      } else {
        // Ensure we're looking in the files directory
        appPath = await window.electronAPI.path.join(appPath, 'files');
      }
      
      const envVariables = await environmentSyncService.readAppEnvironmentVariables(appPath);
      setEnvVars(envVariables.map(env => ({
        key: env.key,
        value: env.value,
        type: env.type
      })));
    } catch (error) {
      console.error('Failed to load environment variables:', error);
      showError(`Failed to load environment variables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setEnvVarsLoading(false);
    }
  };

  const updateEnvironmentVariable = async (key: string, newValue: string) => {
    if (!currentApp) return;
    
    try {
      // Get app path
      let appPath = currentApp.path;
      if (!appPath) {
        const desktop = await window.electronAPI.app.getDesktopPath();
        appPath = await window.electronAPI.path.join(desktop, 'prestige-ai', currentApp.name, 'files');
      } else {
        // Ensure we're looking in the files directory
        appPath = await window.electronAPI.path.join(appPath, 'files');
      }
      
      await environmentSyncService.updateEnvironmentVariable(appPath, key, newValue);
      
      // Update local state
      setEnvVars(prev => prev.map(env => 
        env.key === key ? { ...env, value: newValue } : env
      ));
    } catch (error) {
      console.error('Failed to update environment variable:', error);
      showError(`Failed to update ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const createEnvFile = async () => {
    if (!currentApp) return;
    
    try {
      // Get app path
      let appPath = currentApp.path;
      if (!appPath) {
        const desktop = await window.electronAPI.app.getDesktopPath();
        appPath = await window.electronAPI.path.join(desktop, 'prestige-ai', currentApp.name, 'files');
      } else {
        // Ensure we're looking in the files directory
        appPath = await window.electronAPI.path.join(appPath, 'files');
      }
      
      // Create initial .env file with a comment
      const envPath = await window.electronAPI.path.join(appPath, '.env');
      await window.electronAPI.fs.writeFile(envPath, '# Environment variables for your app\n# Add your API keys and secrets here\n');
      
      showInfo('✅ Created .env file successfully');
      
      // Reload environment variables to show the new file
      loadEnvironmentVariables();
    } catch (error) {
      console.error('Failed to create .env file:', error);
      showError(`Failed to create .env file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleQuickSetup = async () => {
    if (!currentApp) return;
    
    setDeploymentLoading(true);
    try {
      showInfo('⚙️ Setting up complete deployment pipeline...');
      
      // Step 1: Ensure GitHub is connected
      if (!connectionStatus.github.connected) {
        showInfo('📝 GitHub connection required. Please connect GitHub first.');
        handleConnect('github');
        return;
      }
      
      // Step 2: Ensure Vercel is connected  
      if (!connectionStatus.vercel.connected) {
        showInfo('🚀 Vercel connection required. Please connect Vercel first.');
        handleConnect('vercel');
        return;
      }
      
      // Step 3: Create repo if needed
      if (!repositoryInfo.githubRepo) {
        showInfo('📦 Creating GitHub repository...');
        handleCreateRepo();
        return;
      }
      
      // Step 4: Deploy to Vercel
      await handleDeployToVercel();
      
      showSuccess('🎉 Complete deployment pipeline ready!');
    } catch (error) {
      showError(`Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeploymentLoading(false);
    }
  };


  const renderConnectionCard = (
    provider: 'github' | 'supabase' | 'vercel' | 'mongodb',
    icon: React.ElementType,
    name: string,
    description: string,
    color: string
  ) => {
    const status = connectionStatus?.[provider] ?? { connected: false, loading: true } as any;
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
            {status?.loading ? (
              <Badge variant="secondary">Checking...</Badge>
            ) : status?.connected ? (
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
            {provider === 'github' && status.connected && 'user' in status && status.user && (
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
            
            {provider === 'supabase' && status.connected && 'projects' in status && status.projects && (
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
            
            {provider === 'vercel' && status.connected && 'user' in status && status.user && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <p className="font-medium">{status.user.name || status.user.username}</p>
                    <p className="text-gray-500">{'projects' in status ? status.projects?.length || 0 : 0} projects</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnect('vercel')}
                  >
                    Disconnect
                  </Button>
                </div>
                
                {'activeDeployments' in status && (
                  <div className="space-y-2">
                    {status.activeDeployments! > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Activity className="w-3 h-3 text-blue-500" />
                        <span className="text-blue-600 font-medium">
                          {status.activeDeployments} active deployment{status.activeDeployments !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    
                    {'lastDeployment' in status && status.lastDeployment && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600">
                          Last: {status.lastDeployment.status.toLowerCase()}
                        </span>
                        {status.lastDeployment.status === 'READY' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800"
                            onClick={() => window.open(`https://${status.lastDeployment!.url}`, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!status?.connected && !status?.loading && (
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
            {repositoryInfo.loading ? (
              <Button className="justify-start h-auto p-4" variant="outline" disabled>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100">
                    <GitBranch className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Checking Repository...</div>
                    <div className="text-sm text-gray-600">Loading repository status</div>
                  </div>
                </div>
              </Button>
            ) : repositoryInfo.githubRepo ? (
              <Button
                onClick={() => window.open(repositoryInfo.githubRepo!.url, '_blank')}
                className="justify-start h-auto p-4 border-green-200 bg-green-50 hover:bg-green-100"
                variant="outline"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-green-800">Connected to GitHub</div>
                    <div className="text-sm text-green-600">
                      {repositoryInfo.githubRepo.owner}/{repositoryInfo.githubRepo.name}
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 ml-auto text-green-600" />
              </Button>
            ) : (
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
            )}


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

            {/* Enhanced Vercel Deployment Section */}
            {connectionStatus.github.connected && connectionStatus.vercel.connected ? (
              <div className="space-y-3">
                {/* Quick Setup Pipeline */}
                <Button
                  onClick={handleQuickSetup}
                  className="justify-start h-auto p-4 border-green-200 bg-green-50 hover:bg-green-100"
                  variant="outline"
                  disabled={deploymentLoading}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100">
                      <Zap className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-green-800">Setup Complete Pipeline</div>
                      <div className="text-sm text-green-600">
                        {repositoryInfo.githubRepo 
                          ? "Connect GitHub repo to Vercel & deploy"
                          : "Create repo + Vercel project + deploy"}
                      </div>
                    </div>
                  </div>
                  {deploymentLoading ? (
                    <Activity className="w-4 h-4 ml-auto text-green-600 animate-spin" />
                  ) : (
                    <Rocket className="w-4 h-4 ml-auto text-green-600" />
                  )}
                </Button>

                {/* Deploy to Vercel */}
                <Button
                  onClick={handleDeployToVercel}
                  className="justify-start h-auto p-4"
                  variant="outline"
                  disabled={!repositoryInfo.githubRepo || deploymentLoading}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-black">
                      <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Deploy to Vercel</div>
                      <div className="text-sm text-gray-600">
                        {repositoryInfo.githubRepo
                          ? "Deploy your GitHub repository to production"
                          : "GitHub repository required for deployment"}
                      </div>
                    </div>
                  </div>
                  {deploymentLoading ? (
                    <Activity className="w-4 h-4 ml-auto animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4 ml-auto" />
                  )}
                </Button>

                {/* Environment Variables Management */}
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-amber-600" />
                        <CardTitle className="text-sm font-medium text-amber-800">
                          Environment Variables
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {envVars.length} {envVars.length === 1 ? 'variable' : 'variables'}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEnvVarsExpanded(!envVarsExpanded)}
                        className="h-8 w-8 p-0"
                      >
                        {envVarsExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-amber-700">
                      Manage API keys and environment variables for your app
                    </p>
                  </CardHeader>
                  
                  {envVarsExpanded && (
                    <CardContent className="pt-0">
                      {envVarsLoading ? (
                        <div className="flex items-center gap-2 text-sm text-amber-600">
                          <Activity className="w-4 h-4 animate-spin" />
                          <span>Loading environment variables...</span>
                        </div>
                      ) : envVars.length === 0 ? (
                        <div className="space-y-3">
                          <div className="text-sm text-amber-600">
                            No environment variables found. Use &lt;prestige-setup-env&gt; to add API keys.
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={createEnvFile}
                            className="w-full text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Create .env file
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {envVars.map((envVar, index) => (
                            <EnvironmentVariableRow
                              key={envVar.key}
                              envVar={envVar}
                              onUpdate={(newValue) => updateEnvironmentVariable(envVar.key, newValue)}
                            />
                          ))}
                        </div>
                      )}
                      
                      <div className="mt-4 pt-3 border-t border-amber-200">
                        <Button
                          onClick={loadEnvironmentVariables}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          disabled={envVarsLoading}
                        >
                          {envVarsLoading ? (
                            <Activity className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Settings className="w-3 h-3 mr-1" />
                          )}
                          Refresh Variables
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Environment Variables Sync */}
                <Button
                  onClick={handleSyncEnvironmentVars}
                  className="justify-start h-auto p-4"
                  variant="outline"
                  disabled={envSyncLoading}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Settings className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Sync Environment Variables</div>
                      <div className="text-sm text-gray-600">
                        Auto-detect and sync .env files to Vercel
                      </div>
                    </div>
                  </div>
                  {envSyncLoading ? (
                    <Activity className="w-4 h-4 ml-auto animate-spin" />
                  ) : (
                    <Link className="w-4 h-4 ml-auto" />
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Guided Setup */}
                <Alert className="border-blue-200 bg-blue-50">
                  <Rocket className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <div className="font-semibold">Complete Deployment Setup</div>
                    <p className="text-sm mt-1">
                      Connect both GitHub and Vercel for one-click deployments
                    </p>
                  </AlertDescription>
                </Alert>

                {!connectionStatus.github.connected && (
                  <Button
                    onClick={() => handleConnect('github')}
                    className="justify-start h-auto p-4 border-gray-300"
                    variant="outline"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gray-100">
                        <Github className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">1. Connect GitHub</div>
                        <div className="text-sm text-gray-600">Version control for your code</div>
                      </div>
                    </div>
                    <Plus className="w-4 h-4 ml-auto" />
                  </Button>
                )}

                {!connectionStatus.vercel.connected && (
                  <Button
                    onClick={() => handleConnect('vercel')}
                    className="justify-start h-auto p-4 border-gray-300"
                    variant="outline"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-black">
                        <Globe className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">
                          {connectionStatus.github.connected ? '2. ' : ''}Connect Vercel
                        </div>
                        <div className="text-sm text-gray-600">Deployment and hosting platform</div>
                      </div>
                    </div>
                    <Plus className="w-4 h-4 ml-auto" />
                  </Button>
                )}

                {connectionStatus.github.connected && connectionStatus.vercel.connected && (
                  <Button
                    onClick={handleQuickSetup}
                    className="justify-start h-auto p-4 border-green-200 bg-green-50"
                    variant="outline"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-green-800">3. Setup Deployment</div>
                        <div className="text-sm text-green-600">Create pipeline and deploy</div>
                      </div>
                    </div>
                    <Rocket className="w-4 h-4 ml-auto text-green-600" />
                  </Button>
                )}
              </div>
            )}
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
                  backend services, and automated deployment. GitHub + Vercel combination provides 
                  complete CI/CD pipeline with environment variable sync and real-time deployment tracking.
                </div>
                
                {renderConnectionCard(
                  'github',
                  Github,
                  'GitHub',
                  'Version control and repository management',
                  'border-gray-300 bg-gray-50'
                )}
                
                {renderConnectionCard(
                  'mongodb',
                  Database,
                  'MongoDB (Demo)',
                  'Local demo database — zero config required',
                  'border-emerald-300 bg-emerald-50'
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
                  'Instant deployment, environment sync, and production hosting',
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
        currentApp={(currentApp as any) || null}
        onSuccess={handleSetupSuccess}
      />

      <CreateRepoDialog
        isOpen={createRepoDialogOpen}
        onClose={() => setCreateRepoDialogOpen(false)}
        currentApp={currentApp}
        onSuccess={() => {
          setCreateRepoDialogOpen(false);
          checkConnectionStatus();
          checkRepositoryStatus();
        }}
      />
    </>
  );
}