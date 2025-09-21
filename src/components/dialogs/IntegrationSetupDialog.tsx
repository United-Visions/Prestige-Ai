import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Github, Database, Globe, ExternalLink, Copy, CheckCircle, Loader } from 'lucide-react';
import { GitHubService } from '@/services/githubService';
import { SupabaseService } from '@/services/supabaseService';
import { VercelService } from '@/services/vercelService';
import { MongoDBService } from '@/services/mongodbService';
import AppStateManager from '@/services/appStateManager';

interface IntegrationSetupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  provider: 'github' | 'supabase' | 'mongodb' | 'vercel';
  onSuccess?: () => void;
  currentApp?: { id: number; name: string; path?: string } | null;
}

const providerConfig = {
  github: {
    name: 'GitHub',
    icon: Github,
    description: "Connect your GitHub account for version control and deployment automation",
    color: 'border-gray-300 bg-gray-50',
    iconColor: 'text-gray-600',
  },
  mongodb: {
    name: 'MongoDB',
    icon: Database,
    description: 'Connect to MongoDB for a NoSQL database solution',
    color: 'border-green-800 bg-green-50',
    iconColor: 'text-green-800',
  },
  supabase: {
    name: 'Supabase',
    icon: Database,
    description: 'Connect to Supabase for authentication, database, and backend services',
    color: 'border-green-300 bg-green-50',
    iconColor: 'text-green-600',
  },
  vercel: {
    name: 'Vercel',
    icon: Globe,
    description: 'Connect to Vercel for deployment and hosting',
    color: 'border-black bg-gray-50',
    iconColor: 'text-black',
  },
};

export function IntegrationSetupDialog({
  isOpen,
  onClose,
  provider,
  onSuccess,
  currentApp
}: IntegrationSetupDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<'start' | 'waiting' | 'success'>('start');
  const [authData, setAuthData] = useState<any>(null);
  const [mongoConnectionString, setMongoConnectionString] = useState('');

  const config = providerConfig[provider];
  const Icon = config.icon;

  const resetState = () => {
    setIsLoading(false);
    setError(null);
    setAuthStep('start');
    setAuthData(null);
    setMongoConnectionString('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleMongoConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const mongoDBService = MongoDBService.getInstance();
      // Prefer auto-provisioned local demo DB
      const uri = await mongoDBService.ensureLocalEphemeral();
      if (!uri) {
        throw new Error('Could not start local demo MongoDB. Please try again or provide a connection string.');
      }

      // Persist per-app DB settings if available
      if (currentApp) {
        try {
          const appStateManager = AppStateManager.getInstance();
          const vfs = await appStateManager.getVirtualFileSystem(currentApp as any);
          const configPath = '.prestige/integrations.json';
          const now = new Date().toISOString();
          // Read existing config if present
          let existing = '{}';
          try {
            const existingRead = await vfs.readFile(configPath);
            if (existingRead) existing = existingRead;
          } catch {}
          let json: any = {};
          try { json = JSON.parse(existing); } catch { json = {}; }
          json.database = {
            provider: 'mongodb',
            mode: 'demo',
            connectionString: uri,
            updatedAt: now
          };
          await vfs.writeFile(configPath, JSON.stringify(json, null, 2));
          await appStateManager.syncAppToDisk(currentApp as any);
        } catch (persistErr) {
          console.warn('Failed to persist DB settings:', persistErr);
        }
      }

      setAuthStep('success');
      onSuccess?.();
      setTimeout(() => handleClose(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartAuth = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (provider === 'github') {
        // GitHub Device Flow
        if (!GitHubService) {
          throw new Error('GitHub service is not available');
        }
        const githubService = GitHubService.getInstance();
        const result = await githubService.startDeviceFlow();
        
        setAuthData(result);
        setAuthStep('waiting');
        
        // Start polling for authorization in the background
        githubService.startPolling()
          .then((accessToken) => {
            if (accessToken) {
              setAuthStep('success');
              onSuccess?.();
              setTimeout(() => handleClose(), 2000);
            }
          })
          .catch((pollError) => {
            setError(pollError instanceof Error ? pollError.message : 'Authorization failed');
            setAuthStep('start');
          });

      } else if (provider === 'supabase') {
        // Supabase OAuth Flow
        if (!SupabaseService) {
          throw new Error('Supabase service is not available');
        }
        const supabaseService = SupabaseService.getInstance();
        const result = await supabaseService.startOAuthFlow();
        
        window.open(result.authUrl, '_blank');
        
        setAuthData(result);
        setAuthStep('waiting');
        
      } else if (provider === 'vercel') {
        if (!VercelService) {
          throw new Error('Vercel service is not available');
        }
        setError('Vercel integration setup is coming soon!');
      } else if (provider === 'mongodb') {
        // Directly attempt auto-provision of demo DB
        await handleMongoConnect();
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      if (provider !== 'github') {
        setIsLoading(false);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
            Setup {config.name} Integration
          </DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {authStep === 'start' && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                {provider === 'github' && "We'll use GitHub's device flow to securely connect your account."}
                {provider === 'supabase' && "You'll be redirected to Supabase to authorize the connection."}
                {provider === 'mongodb' && "We'll automatically create a local demo MongoDB database — no connection string needed."}
                {provider === 'vercel' && "Connect your Vercel account for deployment automation."}
              </div>
              
              <Button
                onClick={handleStartAuth}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                <Icon className="w-4 h-4 mr-2" />
                Connect to {config.name}
              </Button>
            </div>
          )}

          {/* No waiting step for MongoDB: we auto-provision demo DB */}

          {authStep === 'waiting' && provider === 'github' && authData && (
            <div className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Complete authorization on GitHub:</p>
                    <div className="bg-white p-3 rounded border flex items-center justify-between">
                      <code className="text-lg font-mono">{authData.userCode}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(authData.userCode)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(authData.verificationUri, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Open GitHub
                      </Button>
                      <span className="text-sm text-gray-500">Enter the code above</span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
              
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader className="w-4 h-4 animate-spin" />
                Waiting for authorization...
              </div>
            </div>
          )}

          {authStep === 'waiting' && provider === 'supabase' && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Complete authorization:</p>
                    <p className="text-sm">
                      You should have been redirected to Supabase. After authorizing, 
                      return here and click "I've completed authorization" below.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setAuthStep('start')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setAuthStep('success');
                    onSuccess?.();
                    setTimeout(() => handleClose(), 2000);
                  }}
                  className="flex-1"
                >
                  I've completed authorization
                </Button>
              </div>
            </div>
          )}

          {authStep === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-green-800">Connected Successfully!</h3>
                <p className="text-sm text-green-600 mt-1">
                  Your {config.name} integration is now active.
                </p>
              </div>
            </div>
          )}

          {authStep !== 'success' && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}