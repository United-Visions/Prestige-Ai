import { useState } from 'react';
import { Check, ChevronDown, Key, AlertCircle, CheckCircle } from 'lucide-react';
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

  const getStatusIcon = (model: LargeLanguageModel) => {
    const availability = getModelAvailability(model.name, model.provider);
    
    switch (availability.status) {
      case 'ready':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'api_key_required':
        return <Key className="h-3 w-3 text-orange-500" />;
      case 'unavailable':
      default:
        return <AlertCircle className="h-3 w-3 text-red-500" />;
    }
  };

  const getStatusBadge = (model: LargeLanguageModel) => {
    const availability = getModelAvailability(model.name, model.provider);
    
    switch (availability.status) {
      case 'ready':
        return <Badge variant="outline" className="text-green-600 border-green-200">Ready</Badge>;
      case 'api_key_required':
        return <Badge variant="outline" className="text-orange-600 border-orange-200">API Key Required</Badge>;
      case 'unavailable':
      default:
        return <Badge variant="outline" className="text-red-600 border-red-200">Unavailable</Badge>;
    }
  };

  const getSelectedModelDisplay = () => {
    const modelName = selectedModel.name;
    const providerInfo = modelProviders.find(p => p.id === selectedModel.provider);
    const providerIcon = providerInfo?.icon || '🤖';
    
    return (
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm">{providerIcon}</span>
        <span className="font-medium truncate">{modelName}</span>
        {showStatus && getStatusIcon(selectedModel)}
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {getSelectedModelDisplay()}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search models..." className="h-9" />
          <CommandList>
            <CommandEmpty>No models found.</CommandEmpty>
            {modelProviders.map((provider) => (
              <CommandGroup key={provider.id} heading={provider.name}>
                {provider.models.map((model) => {
                  const isSelected = selectedModel.name === model.name && selectedModel.provider === model.provider;
                  
                  return (
                    <CommandItem
                      key={`${model.provider}-${model.name}`}
                      value={`${model.name} ${model.provider}`}
                      onSelect={() => {
                        onModelSelect(model);
                        setOpen(false);
                      }}
                      className="flex items-center justify-between p-2 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-sm">{provider.icon}</span>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{model.name}</span>
                            {getStatusIcon(model)}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {model.description && (
                              <span className="text-xs text-muted-foreground truncate">
                                {model.description}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(model)}
                          {model.cost && (
                            <Badge variant="secondary" className="text-xs whitespace-nowrap">
                              {model.cost}
                            </Badge>
                          )}
                        </div>
                        <Check
                          className={cn(
                            "h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </div>
                    </CommandItem>
                  );
                })}
                {provider !== modelProviders[modelProviders.length - 1] && (
                  <Separator className="my-2" />
                )}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
        {onApiKeyDialogOpen && (
          <div className="p-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onApiKeyDialogOpen();
                setOpen(false);
              }}
              className="w-full"
            >
              <Key className="h-4 w-4 mr-2" />
              Manage API Keys
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}