import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Github, 
  Loader, 
  CheckCircle, 
  ExternalLink,
  GitBranch,
  Lock,
  Globe
} from 'lucide-react';
import { GitHubService } from '@/services/githubService';
import { gitService } from '@/services/gitService';
import AppStateManager from '@/services/appStateManager';

interface CreateRepoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentApp?: { name: string; path: string } | null;
  onSuccess?: () => void;
}

export function CreateRepoDialog({ 
  isOpen, 
  onClose, 
  currentApp, 
  onSuccess 
}: CreateRepoDialogProps) {
  const [repoName, setRepoName] = useState(
    currentApp ? currentApp.name.toLowerCase().replace(/\s+/g, '-') : ''
  );
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ repo: any } | null>(null);
  const [syncOption, setSyncOption] = useState<'create-only' | 'create-and-sync'>('create-and-sync');

  const resetState = () => {
    setError(null);
    setSuccess(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const validateRepoName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Repository name is required';
    }
    if (name.length < 1 || name.length > 100) {
      return 'Repository name must be between 1 and 100 characters';
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
      return 'Repository name can only contain letters, numbers, dots, hyphens, and underscores';
    }
    if (name.startsWith('.') || name.endsWith('.')) {
      return 'Repository name cannot start or end with a dot';
    }
    if (name.startsWith('-') || name.endsWith('-')) {
      return 'Repository name cannot start or end with a hyphen';
    }
    return null;
  };

  const handleCreateRepo = async () => {
    const nameError = validateRepoName(repoName);
    if (nameError) {
      setError(nameError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const githubService = GitHubService.getInstance();
      
      const isAuthenticated = await githubService.isAuthenticated();
      if (!isAuthenticated) {
        throw new Error('Not authenticated with GitHub. Please connect your GitHub account first.');
      }

      const repo = await githubService.createRepository(repoName, {
        description: description.trim() || undefined,
        private: isPrivate,
        autoInit: false,
      });

      setSuccess({ repo });

      // If sync option is selected and we have a current app, sync it with the repo
      if (syncOption === 'create-and-sync' && currentApp) {
        try {
          console.log('🔗 Linking app to GitHub repository...');
          
          // Get app directory path and ensure files are synced to disk first
          let appPath = currentApp.path;
          if (!appPath) {
            const desktop = await window.electronAPI.app.getDesktopPath();
            appPath = await window.electronAPI.path.join(desktop, 'prestige-ai', currentApp.name);
          }

          // Sync app files to disk before Git operations
          try {
            console.log('💾 Syncing app files to disk...');
            const appStateManager = AppStateManager.getInstance();
            await appStateManager.syncAppToDisk(currentApp);
            console.log('✅ App files synced to disk');
          } catch (syncError) {
            console.error('❌ Failed to sync files to disk:', syncError);
          }

          // Initialize Git repository and link to GitHub
          const syncResult = await gitService.initializeWithGitHub(appPath, repo.cloneUrl);
          
          if (!syncResult.success) {
            console.warn('Git sync failed:', syncResult.error);
            // Don't fail the overall operation, just warn the user
            setError(`Repository created but sync failed: ${syncResult.error}`);
          } else {
            console.log('✅ App successfully linked to GitHub repository');
          }
        } catch (syncError) {
          console.error('Sync error:', syncError);
          setError(`Repository created but sync failed: ${syncError instanceof Error ? syncError.message : 'Unknown sync error'}`);
        }
      }

      onSuccess?.();
      
      // Auto-close after 3 seconds if successful
      setTimeout(() => {
        handleClose();
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create repository');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Github className="w-6 h-6" />
            Create GitHub Repository
          </DialogTitle>
          <DialogDescription>
            Create a new GitHub repository for your project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="space-y-2">
                  <p className="font-medium">Repository created successfully!</p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(success.repo.htmlUrl, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View on GitHub
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {!success && (
            <>
              {currentApp && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription className="text-blue-800">
                    <div className="font-medium">Current App: {currentApp.name}</div>
                    <p className="text-sm mt-1">
                      Creating repository for your active project.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="repo-name">Repository Name *</Label>
                <Input
                  id="repo-name"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="my-awesome-app"
                  disabled={isLoading}
                />
                {repoName && validateRepoName(repoName) && (
                  <p className="text-sm text-red-600">{validateRepoName(repoName)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief description of your project"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="private"
                    checked={isPrivate}
                    onCheckedChange={(checked) => setIsPrivate(!!checked)}
                    disabled={isLoading}
                  />
                  <Label htmlFor="private" className="flex items-center gap-2">
                    {isPrivate ? (
                      <Lock className="w-4 h-4 text-gray-600" />
                    ) : (
                      <Globe className="w-4 h-4 text-gray-600" />
                    )}
                    {isPrivate ? 'Private repository' : 'Public repository'}
                  </Label>
                </div>

              </div>

              {currentApp && (
                <div className="space-y-3">
                  <Label>Sync Options</Label>
                  <RadioGroup
                    value={syncOption}
                    onValueChange={(value: 'create-only' | 'create-and-sync') => setSyncOption(value)}
                    disabled={isLoading}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="create-only" id="create-only" />
                      <Label htmlFor="create-only">Create repository only</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="create-and-sync" id="create-and-sync" />
                      <Label htmlFor="create-and-sync" className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4" />
                        Create and sync current app files
                      </Label>
                    </div>
                  </RadioGroup>
                  
                  {syncOption === 'create-and-sync' && (
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertDescription className="text-yellow-800">
                        <p className="text-sm">
                          This will initialize git in your app directory, add all files, 
                          and make an initial commit to the new repository.
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateRepo}
                  disabled={isLoading || !repoName.trim() || !!validateRepoName(repoName)}
                  className="flex-1"
                >
                  {isLoading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                  <Github className="w-4 h-4 mr-2" />
                  Create Repository
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}