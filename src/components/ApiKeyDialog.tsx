import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Key, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useApiKeyStore } from '@/lib/apiKeys';
import { modelProviders } from '@/lib/models';
import type { ModelProvider } from '@/lib/models';

// Helper function to mask ENV API keys
const maskEnvApiKey = (key: string | undefined): string => {
  if (!key) return 'Not Set';
  if (key.length < 8) return '****';
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
};

interface ApiKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  provider?: ModelProvider;
}

export function ApiKeyDialog({ isOpen, onClose }: ApiKeyDialogProps) {
  const [showKeys, setShowKeys] = useState<Record<ModelProvider, boolean>>({} as Record<ModelProvider, boolean>);
  const [envVars, setEnvVars] = useState<Record<string, string | undefined>>({});
  const { getApiKey, setApiKey, removeApiKey, getProviderStatus, refreshEnvVars } = useApiKeyStore();

  const providers = modelProviders.filter(p => p.apiKeyRequired);

  // Load environment variables when dialog opens
  useEffect(() => {
    if (isOpen && window.electronAPI) {
      window.electronAPI.getAllEnvVars().then(vars => {
        setEnvVars(vars);
        refreshEnvVars();
      });
    }
  }, [isOpen, refreshEnvVars]);

  const handleSetApiKey = (provider: ModelProvider, key: string) => {
    if (key.trim()) {
      setApiKey(provider, key.trim());
    } else {
      removeApiKey(provider);
    }
  };

  const toggleShowKey = (provider: ModelProvider) => {
    setShowKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  const getStatusBadge = (provider: ModelProvider) => {
    const status = getProviderStatus(provider);
    const currentKey = getApiKey(provider.id);
    const envKey = provider.envVar ? envVars[provider.envVar] : undefined;
    
    const hasUserKey = !!currentKey;
    const hasEnvKey = !!envKey;
    
    if (hasUserKey || hasEnvKey) {
      return <Badge variant="outline" className="text-green-600 border-green-200">✓ Configured</Badge>;
    } else {
      return <Badge variant="outline" className="text-gray-600 border-gray-200">Not Set</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Keys Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {providers.map((provider) => {
            const currentKey = getApiKey(provider.id) || '';
            const isVisible = showKeys[provider.id] || false;
            const status = getProviderStatus(provider.id);
            const envApiKey = provider.envVar ? envVars[provider.envVar] : undefined;
            const hasEnvKey = !!envApiKey;
            
            const isValidUserKey = !!currentKey && !currentKey.startsWith('Invalid Key') && currentKey !== 'Not Set';
            const activeKeySource = isValidUserKey ? 'settings' : hasEnvKey ? 'env' : 'none';
            
            const defaultAccordionValue = [];
            if (isValidUserKey || !hasEnvKey) {
              defaultAccordionValue.push('settings-key');
            }
            if (hasEnvKey) {
              defaultAccordionValue.push('env-key');
            }

            return (
              <div key={provider.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{provider.icon}</span>
                    <div>
                      <h3 className="font-medium">{provider.name}</h3>
                      <p className="text-sm text-muted-foreground">{provider.description}</p>
                    </div>
                  </div>
                  {getStatusBadge(provider.id)}
                </div>

                <Accordion
                  type="multiple"
                  className="w-full space-y-2"
                  defaultValue={defaultAccordionValue}
                >
                  <AccordionItem value="settings-key" className="border rounded-lg px-4">
                    <AccordionTrigger className="text-sm font-medium hover:no-underline">
                      API Key from Settings
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                      {isValidUserKey && (
                        <Alert className="mb-4">
                          <Key className="h-4 w-4" />
                          <AlertTitle className="flex justify-between items-center">
                            <span>Current Key (Settings)</span>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleSetApiKey(provider.id, '')}
                              className="flex items-center gap-1 h-7 px-2"
                            >
                              Remove
                            </Button>
                          </AlertTitle>
                          <AlertDescription>
                            <p className="font-mono text-sm">{maskEnvApiKey(currentKey)}</p>
                            {activeKeySource === 'settings' && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                This key is currently active.
                              </p>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="space-y-2">
                        <Label htmlFor={`${provider.id}-key`}>
                          {isValidUserKey ? 'Update' : 'Set'} {provider.name} API Key
                        </Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              id={`${provider.id}-key`}
                              type={isVisible ? 'text' : 'password'}
                              value={currentKey}
                              onChange={(e) => handleSetApiKey(provider.id, e.target.value)}
                              placeholder={`Enter new ${provider.name} API key here`}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => toggleShowKey(provider.id)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                              {isVisible ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Setting a key here will override the environment variable (if set).
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {provider.envVar && (
                    <AccordionItem value="env-key" className="border rounded-lg px-4">
                      <AccordionTrigger className="text-sm font-medium hover:no-underline">
                        API Key from Environment Variable
                      </AccordionTrigger>
                      <AccordionContent className="pt-4">
                        {hasEnvKey ? (
                          <Alert>
                            <Key className="h-4 w-4" />
                            <AlertTitle>Environment Variable Key ({provider.envVar})</AlertTitle>
                            <AlertDescription>
                              <p className="font-mono text-sm">
                                {maskEnvApiKey(envApiKey)}
                              </p>
                              {activeKeySource === 'env' && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                  This key is currently active (no settings key set).
                                </p>
                              )}
                              {activeKeySource === 'settings' && (
                                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                  This key is currently being overridden by the key set in Settings.
                                </p>
                              )}
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Environment Variable Not Set</AlertTitle>
                            <AlertDescription>
                              The{' '}
                              <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">
                                {provider.envVar}
                              </code>{' '}
                              environment variable is not set.
                            </AlertDescription>
                          </Alert>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                          This key is set outside the application. If present, it will be used only if no key is configured in the Settings section above. Requires app restart to detect changes.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </div>
            );
          })}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}