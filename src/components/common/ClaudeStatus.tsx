import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { ClaudeCodeService } from '@/services/claudeCodeService';

interface ClaudeStatusProps {
  onStatusChange?: (isAvailable: boolean) => void;
}

export function ClaudeStatus({ onStatusChange }: ClaudeStatusProps) {
  const [status, setStatus] = useState<'checking' | 'available' | 'limited' | 'unavailable'>('checking');
  const resetTime = '6pm';

  const checkStatus = async () => {
    setStatus('checking');
    try {
      const claudeService = ClaudeCodeService.getInstance();
      const isAvailable = await claudeService.checkAvailability();
      
      if (isAvailable) {
        setStatus('available');
        onStatusChange?.(true);
      } else {
        setStatus('unavailable');
        onStatusChange?.(false);
      }
    } catch (error) {
      setStatus('unavailable');
      onStatusChange?.(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  if (status === 'checking') {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Checking Claude Code status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'available') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Claude Code CLI Ready</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={checkStatus}
              className="h-6 px-2 text-xs"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'limited') {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-orange-600 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="text-orange-800 font-medium">Usage Limit Reached</p>
              <p className="text-orange-700 text-xs mt-1">
                Claude Code CLI usage limit reached. Resets around {resetTime}.
              </p>
              <p className="text-orange-600 text-xs mt-1">
                The app will automatically use simulation mode for now.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={checkStatus}
              className="h-6 px-2 text-xs"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="text-red-800 font-medium">Claude Code CLI Unavailable</p>
            <p className="text-red-700 text-xs mt-1">
              Install with: <code className="bg-red-100 px-1 rounded">npm install -g @anthropic/claude</code>
            </p>
            <p className="text-red-600 text-xs mt-1">
              Using simulation mode for development.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={checkStatus}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}