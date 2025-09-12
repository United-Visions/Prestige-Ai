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

interface IntegrationSetupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  provider: 'github' | 'supabase' | 'vercel';
  onSuccess?: () => void;
}

const providerConfig = {
  github: {
    name: 'GitHub',
    icon: Github,
    description: 'Connect your GitHub account for version control and deployment automation',
    color: 'border-gray-300 bg-gray-50',
    iconColor: 'text-gray-600',
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
  onSuccess
}: IntegrationSetupDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<'start' | 'waiting' | 'success'>('start');
  const [authData, setAuthData] = useState<any>(null);

  const config = providerConfig[provider];
  const Icon = config.icon;

  const resetState = () => {
    setIsLoading(false);
    setError(null);
    setAuthStep('start');
    setAuthData(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
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
        
        // Open OAuth URL in external browser
        // Note: electronAPI doesn't have openExternal, so we use window.open
        window.open(result.authUrl, '_blank');
        
        setAuthData(result);
        setAuthStep('waiting');
        
        // In a real implementation, we'd listen for the OAuth callback
        // For now, show instructions to complete setup manually
        
      } else if (provider === 'vercel') {
        // Vercel OAuth Flow  
        if (!VercelService) {
          throw new Error('Vercel service is not available');
        }
        // For now, show coming soon message
        setError('Vercel integration setup is coming soon!');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setIsLoading(false);
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
                {provider === 'github' && 'We\'ll use GitHub\'s device flow to securely connect your account.'}
                {provider === 'supabase' && 'You\'ll be redirected to Supabase to authorize the connection.'}
                {provider === 'vercel' && 'Connect your Vercel account for deployment automation.'}
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

          {authStep === 'start' && (
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