import { useEffect, useState } from 'react';
import { Check, ChevronDown, Key, Terminal, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { modelProviders, LargeLanguageModel } from '@/lib/models';
import { useApiKeyStore, getModelAvailability } from '@/lib/apiKeys';

interface EnhancedModelPickerProps {
  selectedModel: LargeLanguageModel;
  onModelSelect: (model: LargeLanguageModel) => void;
  onApiKeyDialogOpen?: () => void;
  className?: string;
  showStatus?: boolean;
}

export function EnhancedModelPicker({ 
  selectedModel,
  onModelSelect,
  onApiKeyDialogOpen, 
  className, 
  showStatus = true 
}: EnhancedModelPickerProps) {
  const [open, setOpen] = useState(false);
  
  const { getProviderStatus, checkClaudeCodeCli, cliStatus } = useApiKeyStore();

  useEffect(() => {
    // Check Claude Code CLI availability on mount
    checkClaudeCodeCli();
  }, [checkClaudeCodeCli]);

  const getStatusIcon = (model: LargeLanguageModel) => {
    const availability = getModelAvailability(model.name, model.provider);
    
    if (model.name === 'Claude Code') {
      const anthropicStatus = getProviderStatus('anthropic');
      const hasApiKey = anthropicStatus.hasKey && anthropicStatus.isValid;
      const hasCli = cliStatus.claudeCodeAvailable;
      
      if (hasApiKey) {
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      } else if (hasCli) {
        return <Terminal className="h-3 w-3 text-blue-500" />;
      } else {
        return <AlertCircle className="h-3 w-3 text-orange-500" />;
      }
    }
    
    switch (availability.status) {
      case 'ready':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'needs-setup':
        return <Key className="h-3 w-3 text-orange-500" />;
      default:
        return <AlertCircle className="h-3 w-3 text-red-500" />;
    }
  };

  const getStatusBadge = (model: LargeLanguageModel) => {
    const availability = getModelAvailability(model.name, model.provider);
    
    if (model.name === 'Claude Code') {
      const anthropicStatus = getProviderStatus('anthropic');
      const hasApiKey = anthropicStatus.hasKey && anthropicStatus.isValid;
      const hasCli = cliStatus.claudeCodeAvailable;
      
      if (hasApiKey) {
        return <Badge variant="outline" className="text-green-600 border-green-200">API Ready</Badge>;
      } else if (hasCli) {
        return <Badge variant="outline" className="text-blue-600 border-blue-200">CLI Ready</Badge>;
      } else {
        return <Badge variant="outline" className="text-orange-600 border-orange-200">Setup Needed</Badge>;
      }
    }
    
    switch (availability.status) {
      case 'ready':
        return <Badge variant="outline" className="text-green-600 border-green-200">Ready</Badge>;
      case 'needs-setup':
        return <Badge variant="outline" className="text-orange-600 border-orange-200">API Key Needed</Badge>;
      default:
        return <Badge variant="outline" className="text-red-600 border-red-200">Error</Badge>;
    }
  };

  const getHeaderStatus = () => {
    if (selectedModel.name === 'Claude Code') {
      const anthropicStatus = getProviderStatus('anthropic');
      const hasApiKey = anthropicStatus.hasKey && anthropicStatus.isValid;
      const hasCli = cliStatus.claudeCodeAvailable;
      
      if (hasApiKey) {
        return { icon: <CheckCircle className="h-4 w-4 text-green-500" />, text: "API Ready" };
      } else if (hasCli) {
        return { icon: <Terminal className="h-4 w-4 text-blue-500" />, text: "CLI Ready" };
      } else {
        return { icon: <AlertCircle className="h-4 w-4 text-orange-500" />, text: "Setup Needed" };
      }
    }
    
    const availability = getModelAvailability(selectedModel.name, selectedModel.provider);
    switch (availability.status) {
      case 'ready':
        return { icon: <CheckCircle className="h-4 w-4 text-green-500" />, text: "Ready" };
      case 'needs-setup':
        return { icon: <Key className="h-4 w-4 text-orange-500" />, text: "API Key Needed" };
      default:
        return { icon: <AlertCircle className="h-4 w-4 text-red-500" />, text: "Error" };
    }
  };

  const handleApiKeySetup = () => {
    onApiKeyDialogOpen?.();
    setOpen(false);
  };

  const handleModelSelect = (model: LargeLanguageModel) => {
    onModelSelect(model);
    setOpen(false);
  };

  const headerStatus = getHeaderStatus();

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-[300px] justify-between", className)}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{modelProviders.find(p => p.id === selectedModel.provider)?.icon}</span>
              <span className="truncate">{selectedModel.name}</span>
              {showStatus && headerStatus.icon}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0">
          <Command>
            <CommandInput placeholder="Search models..." />
            <CommandList>
              <CommandEmpty>No models found.</CommandEmpty>
              {modelProviders.map((provider) => (
                <CommandGroup key={provider.id} heading={
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{provider.icon}</span>
                      <span>{provider.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {provider.apiKeyRequired && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleApiKeySetup}
                          className="text-xs h-6 px-2"
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Setup
                        </Button>
                      )}
                    </div>
                  </div>
                }>
                  {provider.models.map((model) => {
                    const isSelected = selectedModel.name === model.name && selectedModel.provider === model.provider;
                    
                    return (
                      <CommandItem
                        key={`${model.provider}-${model.name}`}
                        value={`${model.provider}-${model.name}`}
                        onSelect={() => handleModelSelect(model)}
                        className="flex items-center justify-between p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Check
                            className={cn(
                              "h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{model.name}</span>
                              {model.requiresCli && <Terminal className="h-3 w-3 text-blue-500" />}
                            </div>
                            <span className="text-xs text-muted-foreground">{model.description}</span>
                            {model.cost && (
                              <span className="text-xs text-muted-foreground font-mono">{model.cost}</span>
                            )}
                            {model.contextWindow && (
                              <span className="text-xs text-muted-foreground">
                                Context: {model.contextWindow.toLocaleString()} tokens
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getStatusIcon(model)}
                          {showStatus && getStatusBadge(model)}
                        </div>
                      </CommandItem>
                    );
                  })}
                  {provider.id !== modelProviders[modelProviders.length - 1].id && <Separator className="my-2" />}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}