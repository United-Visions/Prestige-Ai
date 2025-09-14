import React, { useState, useEffect } from 'react';
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
import { 
  Github, 
  Loader, 
  CheckCircle, 
  ExternalLink,
  GitMerge,
  Search,
  GitBranch
} from 'lucide-react';
import { GitHubService } from '@/services/githubService';
import { gitService } from '@/services/gitService';

interface ConnectRepoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentApp?: { name: string; path: string } | null;
  onSuccess?: () => void;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description?: string;
  html_url: string;
  clone_url: string;
  private: boolean;
  updated_at: string;
}

export function ConnectRepoDialog({ 
  isOpen, 
  onClose, 
  currentApp, 
  onSuccess 
}: ConnectRepoDialogProps) {
  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadRepositories();
    }
  }, [isOpen]);

  useEffect(() => {
    // Filter repositories based on search term
    const filtered = repositories.filter(repo =>
      repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredRepos(filtered);
  }, [repositories, searchTerm]);

  const resetState = () => {
    setError(null);
    setSuccess(null);
    setSelectedRepo(null);
    setSearchTerm('');
    setIsConnecting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const loadRepositories = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const githubService = GitHubService.getInstance();
      
      const isAuthenticated = await githubService.isAuthenticated();
      if (!isAuthenticated) {
        throw new Error('Not authenticated with GitHub. Please connect your GitHub account first.');
      }

      const repos = await githubService.getRepositories();
      setRepositories(repos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectRepo = async () => {
    if (!selectedRepo || !currentApp) return;

    setIsConnecting(true);
    setError(null);

    try {
      // Get app directory path
      let appPath = currentApp.path;
      if (!appPath) {
        const desktop = await window.electronAPI.app.getDesktopPath();
        appPath = await window.electronAPI.path.join(desktop, 'prestige-ai', currentApp.name);
      }

      // Check if directory is already a git repository
      const isGitRepo = await gitService.isGitRepository(appPath);
      
      if (isGitRepo) {
        // If it's already a git repo, just add the remote
        const remotes = await gitService.listRemotes(appPath);
        const hasOrigin = remotes.some(remote => remote.name === 'origin');
        
        if (hasOrigin) {
          // Replace existing origin
          await window.electronAPI.git.remoteAdd(appPath, 'origin-backup', remotes[0].url);
          await gitService.addRemote(appPath, 'origin', selectedRepo.clone_url);
        } else {
          await gitService.addRemote(appPath, 'origin', selectedRepo.clone_url);
        }
      } else {
        // Initialize git and connect to GitHub
        const connectResult = await gitService.initializeWithGitHub(appPath, selectedRepo.clone_url);
        if (!connectResult.success) {
          throw new Error(connectResult.error || 'Failed to initialize Git repository');
        }
      }

      setSuccess(`Successfully connected to ${selectedRepo.full_name}`);
      
      onSuccess?.();
      
      // Auto-close after 3 seconds if successful
      setTimeout(() => {
        handleClose();
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect repository');
    } finally {
      setIsConnecting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <GitMerge className="w-6 h-6" />
            Connect Existing Repository
          </DialogTitle>
          <DialogDescription>
            Select a GitHub repository to connect with {currentApp?.name || 'your app'}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Search */}
          <div className="space-y-2">
            <Label>Search Repositories</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search your repositories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Repository List */}
          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Loading your repositories...</p>
                </div>
              </div>
            ) : filteredRepos.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Github className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {repositories.length === 0 ? 'No Repositories Found' : 'No Results'}
                  </h3>
                  <p className="text-gray-500">
                    {repositories.length === 0 
                      ? 'You don\'t have any repositories yet. Create one first!'
                      : 'Try adjusting your search terms.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full overflow-auto space-y-2 pr-2">
                {filteredRepos.map((repo) => (
                  <div
                    key={repo.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedRepo?.id === repo.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedRepo(repo)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <GitBranch className="w-4 h-4 text-gray-500" />
                          <h4 className="font-semibold text-gray-800">{repo.name}</h4>
                          {repo.private && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                              Private
                            </span>
                          )}
                        </div>
                        
                        {repo.description && (
                          <p className="text-sm text-gray-600 mb-2">{repo.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{repo.full_name}</span>
                          <span>Updated {formatDate(repo.updated_at)}</span>
                        </div>
                      </div>
                      
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 text-blue-600 hover:text-blue-800"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600">
            {selectedRepo ? `Selected: ${selectedRepo.name}` : 'Select a repository to connect'}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isConnecting}>
              Cancel
            </Button>
            <Button
              onClick={handleConnectRepo}
              disabled={!selectedRepo || isConnecting}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {isConnecting ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <GitMerge className="w-4 h-4 mr-2" />
                  Connect Repository
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}