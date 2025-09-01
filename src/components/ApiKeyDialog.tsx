import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Key, AlertCircle, CheckCircle } from 'lucide-react';
import { Provider, getApiKey, setApiKey, validateApiKey, checkClaudeCodeCLI } from '@/lib/apiKeys';

interface ApiKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  provider?: Provider;
}

export function ApiKeyDialog({ isOpen, onClose }: ApiKeyDialogProps) {
  const [apiKeys, setApiKeys] = useState<Record<Provider, string>>({
    anthropic: '',
    google: '',
  });
  const [showKeys, setShowKeys] = useState<Record<Provider, boolean>>({
    anthropic: false,
    google: false,
  });
  const [validationStatus, setValidationStatus] = useState<Record<Provider, boolean | null>>({
    anthropic: null,
    google: null,
  });
  const [claudeCodeStatus, setClaudeCodeStatus] = useState<boolean | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load existing API keys
      const anthropicKey = getApiKey('anthropic');
      const googleKey = getApiKey('google');
      
      setApiKeys({
        anthropic: anthropicKey || '',
        google: googleKey || '',
      });

      // Check Claude Code CLI availability
      checkClaudeCodeCLI().then(setClaudeCodeStatus);

      // Validate existing keys
      if (anthropicKey) validateKey('anthropic', anthropicKey);
      if (googleKey) validateKey('google', googleKey);
    }
  }, [isOpen]);

  const validateKey = async (provider: Provider, key: string) => {
    if (!key.trim()) {
      setValidationStatus(prev => ({ ...prev, [provider]: null }));
      return;
    }

    setIsValidating(true);
    try {
      const isValid = await validateApiKey(provider, key);
      setValidationStatus(prev => ({ ...prev, [provider]: isValid }));
    } catch (error) {
      console.error(`Failed to validate ${provider} API key:`, error);
      setValidationStatus(prev => ({ ...prev, [provider]: false }));
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveKey = (provider: Provider) => {
    const key = apiKeys[provider];
    if (key.trim()) {
      setApiKey(provider, key);
      validateKey(provider, key);
    } else {
      // Remove key if empty
      setApiKey(provider, '');
      setValidationStatus(prev => ({ ...prev, [provider]: null }));
    }
  };

  const toggleShowKey = (provider: Provider) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const getStatusBadge = (provider: Provider) => {
    const status = validationStatus[provider];
    if (status === null) {
      return <Badge variant="outline">Not Set</Badge>;
    }
    return status ? (
      <Badge className="bg-green-100 text-green-700">
        <CheckCircle className="w-3 h-3 mr-1" />
        Valid
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-700">
        <AlertCircle className="w-3 h-3 mr-1" />
        Invalid
      </Badge>
    );
  };

  const providers: { key: Provider; name: string; description: string }[] = [
    {
      key: 'anthropic',
      name: 'Anthropic',
      description: 'Claude 3.5 Sonnet, Haiku, Opus models',
    },
    {
      key: 'google',
      name: 'Google AI',
      description: 'Gemini 1.5 Pro, Flash, 2.0 experimental models',
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Key Management
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {providers.map(({ key, name, description }) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">{name}</Label>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
                {getStatusBadge(key)}
              </div>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKeys[key] ? 'text' : 'password'}
                    value={apiKeys[key]}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={`Enter ${name} API key...`}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => toggleShowKey(key)}
                  >
                    {showKeys[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <Button
                  onClick={() => handleSaveKey(key)}
                  disabled={isValidating}
                  size="sm"
                >
                  Save
                </Button>
              </div>
            </div>
          ))}

          {/* Claude Code CLI Status */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Claude Code CLI</Label>
                <p className="text-xs text-gray-500">Standalone CLI for Claude models</p>
              </div>
              {claudeCodeStatus === null ? (
                <Badge variant="outline">Checking...</Badge>
              ) : claudeCodeStatus ? (
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Available
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-700">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Not Found
                </Badge>
              )}
            </div>
            {claudeCodeStatus === false && (
              <p className="text-xs text-gray-500 mt-2">
                Install Claude Code CLI to use Claude models without API keys
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}