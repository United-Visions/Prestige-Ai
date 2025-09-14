import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  GitBranch, 
  GitCommit, 
  Plus, 
  Minus, 
  FileCode, 
  Clock,
  Upload,
  Download,
  RefreshCw,
  Check,
  X,
  AlertTriangle
} from 'lucide-react';
import { showToast } from '@/utils/toast';
import useAppStore from '@/stores/appStore';
import { GitStatusService, type GitFileStatus, type GitStatus } from '@/services/gitStatusService';

interface SourceControlPanelProps {
  className?: string;
}

export function SourceControlPanel({ className = '' }: SourceControlPanelProps) {
  const { currentApp } = useAppStore();
  const [gitStatus, setGitStatus] = useState<GitStatus>({
    files: [],
    branch: { current: 'main', ahead: 0, behind: 0 },
    isRepo: false,
    hasChanges: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  
  const gitService = GitStatusService.getInstance();

  // Load git status
  const loadGitStatus = async () => {
    if (!currentApp?.path) return;
    
    setIsLoading(true);
    try {
      const status = await gitService.getStatus(currentApp.path);
      setGitStatus(status);
      
      // Only try to generate commit message if we have staged files and the API is available
      const stagedFiles = status.files.filter(f => f.status === 'staged');
      if (stagedFiles.length > 0) {
        try {
          const message = await gitService.generateCommitMessage(currentApp.path, stagedFiles);
          setCommitMessage(message);
        } catch (error) {
          console.warn('Failed to generate commit message:', error);
          setCommitMessage('feat: Update project files\n\n🤖 Generated with Claude Code\n\nCo-Authored-By: Claude <noreply@anthropic.com>');
        }
      } else {
        setCommitMessage('');
      }
    } catch (error) {
      console.warn('Failed to load git status:', error);
      // Don't show error toast, just provide basic functionality
      setGitStatus({
        files: [],
        branch: { current: 'main', ahead: 0, behind: 0 },
        isRepo: true,
        hasChanges: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentApp?.path) {
      loadGitStatus();
      
      // Set up file system watcher
      gitService.startWatching(currentApp.path, (status) => {
        setGitStatus(status);
      });
      
      // Cleanup watcher on unmount
      return () => {
        gitService.stopWatching(currentApp.path);
      };
    }
  }, [currentApp]);

  const stageFile = async (filePath: string) => {
    if (!currentApp?.path) return;
    
    try {
      await gitService.stageFile(currentApp.path, filePath);
      await loadGitStatus(); // Refresh status
      showToast(`Staged ${filePath}`, 'success');
    } catch (error) {
      showToast('Failed to stage file', 'error');
    }
  };

  const unstageFile = async (filePath: string) => {
    if (!currentApp?.path) return;
    
    try {
      await gitService.unstageFile(currentApp.path, filePath);
      await loadGitStatus(); // Refresh status
      showToast(`Unstaged ${filePath}`, 'success');
    } catch (error) {
      showToast('Failed to unstage file', 'error');
    }
  };

  const stageAll = async () => {
    if (!currentApp?.path) return;
    
    try {
      await gitService.stageAll(currentApp.path);
      await loadGitStatus();
      showToast('Staged all files', 'success');
    } catch (error) {
      showToast('Failed to stage all files', 'error');
    }
  };

  const unstageAll = async () => {
    if (!currentApp?.path) return;
    
    try {
      await gitService.unstageAll(currentApp.path);
      await loadGitStatus();
      showToast('Unstaged all files', 'success');
    } catch (error) {
      showToast('Failed to unstage all files', 'error');
    }
  };

  const commitChanges = async () => {
    if (!currentApp?.path || !commitMessage.trim()) {
      showToast('Commit message is required', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const stagedFiles = gitStatus.files.filter(f => f.status === 'staged');
      if (stagedFiles.length === 0) {
        showToast('No staged changes to commit', 'error');
        return;
      }

      await gitService.commit(currentApp.path, commitMessage);
      await loadGitStatus();
      setCommitMessage('');
      showToast(`Committed ${stagedFiles.length} files`, 'success');
    } catch (error) {
      showToast('Failed to commit changes', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const pushChanges = async () => {
    if (!currentApp?.path || gitStatus.branch.ahead === 0) {
      showToast('No commits to push', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await gitService.push(currentApp.path);
      await loadGitStatus();
      showToast('Successfully pushed changes', 'success');
    } catch (error) {
      showToast('Failed to push changes', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const pullChanges = async () => {
    if (!currentApp?.path) return;
    
    setIsLoading(true);
    try {
      await gitService.pull(currentApp.path);
      await loadGitStatus();
      showToast('Successfully pulled changes', 'success');
    } catch (error) {
      showToast('Failed to pull changes', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: GitFileStatus['status']) => {
    switch (status) {
      case 'modified': return <FileCode className="w-4 h-4 text-yellow-600" />;
      case 'added': return <Plus className="w-4 h-4 text-green-600" />;
      case 'deleted': return <Minus className="w-4 h-4 text-red-600" />;
      case 'untracked': return <AlertTriangle className="w-4 h-4 text-blue-600" />;
      case 'staged': return <Check className="w-4 h-4 text-green-600" />;
      default: return <FileCode className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: GitFileStatus['status']) => {
    switch (status) {
      case 'modified': return 'border-yellow-200 bg-yellow-50';
      case 'added': return 'border-green-200 bg-green-50';
      case 'deleted': return 'border-red-200 bg-red-50';
      case 'untracked': return 'border-blue-200 bg-blue-50';
      case 'staged': return 'border-green-300 bg-green-100';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const stagedFiles = gitStatus.files.filter(f => f.status === 'staged');
  const unstagedFiles = gitStatus.files.filter(f => f.status !== 'staged');

  return (
    <div className={`h-full flex flex-col bg-gradient-to-b from-white to-gray-50/50 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200/50 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
            <GitBranch className="w-3 h-3 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-800">Source Control</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadGitStatus}
            disabled={isLoading}
            className="ml-auto h-6 w-6 p-0"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {/* Branch info */}
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <GitBranch className="w-3 h-3" />
            <span className="font-mono">{gitStatus.branch.current}</span>
          </div>
          <div className="flex items-center gap-3">
            {gitStatus.branch.ahead > 0 && (
              <span className="flex items-center gap-1 text-green-600">
                <Upload className="w-3 h-3" />
                {gitStatus.branch.ahead}
              </span>
            )}
            {gitStatus.branch.behind > 0 && (
              <span className="flex items-center gap-1 text-blue-600">
                <Download className="w-3 h-3" />
                {gitStatus.branch.behind}
              </span>
            )}
          </div>
        </div>

        {/* Sync buttons */}
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={pullChanges}
            disabled={isLoading || gitStatus.branch.behind === 0}
            className="flex-1 h-8 text-xs"
          >
            <Download className="w-3 h-3 mr-1" />
            Pull
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={pushChanges}
            disabled={isLoading || gitStatus.branch.ahead === 0}
            className="flex-1 h-8 text-xs"
          >
            <Upload className="w-3 h-3 mr-1" />
            Push
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Staged Changes */}
        {stagedFiles.length > 0 && (
          <div className="p-4 border-b border-gray-200/50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                Staged Changes ({stagedFiles.length})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={unstageAll}
                className="h-6 px-2 text-xs"
              >
                Unstage All
              </Button>
            </div>
            <div className="space-y-1">
              {stagedFiles.map((file) => (
                <div
                  key={file.path}
                  className={`flex items-center justify-between p-2 rounded-lg border ${getStatusColor(file.status)}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {getStatusIcon(file.status)}
                    <span className={`font-mono text-xs truncate ${file.status === 'deleted' ? 'line-through' : ''}`}>
                      {file.path}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => unstageFile(file.path)}
                    className="h-6 w-6 p-0"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unstaged Changes */}
        {unstagedFiles.length > 0 && (
          <div className="p-4 border-b border-gray-200/50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                Changes ({unstagedFiles.length})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={stageAll}
                className="h-6 px-2 text-xs"
              >
                Stage All
              </Button>
            </div>
            <div className="space-y-1">
              {unstagedFiles.map((file) => (
                <div
                  key={file.path}
                  className={`flex items-center justify-between p-2 rounded-lg border ${getStatusColor(file.status)}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {getStatusIcon(file.status)}
                    <span className={`font-mono text-xs truncate ${file.status === 'deleted' ? 'line-through' : ''}`}>
                      {file.path}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => stageFile(file.path)}
                    className="h-6 w-6 p-0"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Not a git repository */}
        {!gitStatus.isRepo && !isLoading && (
          <div className="p-8 text-center text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 flex items-center justify-center border border-gray-200">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="font-medium mb-2">Not a Git Repository</div>
            <div className="text-xs text-gray-400">Initialize git or open a git repository to use source control</div>
          </div>
        )}

        {/* No changes */}
        {gitStatus.files.length === 0 && !isLoading && gitStatus.isRepo && (
          <div className="p-8 text-center text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-blue-500/10 flex items-center justify-center border border-gray-200">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <div className="font-medium mb-2">No Changes</div>
            <div className="text-xs text-gray-400">Working tree clean</div>
          </div>
        )}
      </div>

      {/* Commit Section */}
      {stagedFiles.length > 0 && (
        <div className="border-t border-gray-200/50 p-4 bg-white">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Commit Message (Auto-generated)
              </label>
              <textarea
                value={commitMessage}
                readOnly
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-gray-50 text-gray-700 resize-none cursor-not-allowed"
                rows={3}
                placeholder="Commit message will be auto-generated by AI..."
              />
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Message generated by AI agent
              </div>
            </div>
            <Button
              onClick={commitChanges}
              disabled={isLoading || stagedFiles.length === 0}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <GitCommit className="w-4 h-4 mr-2" />
              Commit Changes ({stagedFiles.length})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}