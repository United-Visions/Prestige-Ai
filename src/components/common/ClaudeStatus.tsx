import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useApiKeyStore } from '@/lib/apiKeys';

interface ClaudeStatusProps {
  onStatusChange?: (available: boolean) => void;
}

export function ClaudeStatus({ onStatusChange }: ClaudeStatusProps) {
  const [status, setStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const { getAvailableProviders } = useApiKeyStore();

  const checkStatus = () => {
    setStatus('checking');
    
    try {
      const availableProviders = getAvailableProviders();
      const hasValidKeys = availableProviders.length > 0;
      
      if (hasValidKeys) {
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
            <span>Checking API status...</span>
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
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>API Models Ready</span>
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
            <p className="text-red-800 font-medium">API Keys Required</p>
            <p className="text-red-700 text-xs mt-1">
              Configure API keys in settings to use AI models.
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