import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import useAppStore from '@/stores/appStore';
import { ChevronDown, CheckCircle, XCircle, Zap } from 'lucide-react';

export function ModelSelector() {
  const { availableModels, selectedModel, setSelectedModel } = useAppStore();
  const [isOpen, setIsOpen] = React.useState(false);

  const currentModel = availableModels.find(m => m.id === selectedModel);

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <Zap className="w-4 h-4" />
        <span>{currentModel?.name || 'Select Model'}</span>
        <ChevronDown className="w-4 h-4" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <Card className="absolute right-0 top-full mt-2 w-80 z-20">
            <CardContent className="p-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Available Models</h3>
                
                {availableModels.map((model) => (
                  <div
                    key={model.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedModel === model.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => {
                      setSelectedModel(model.id);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{model.name}</h4>
                          {model.isAvailable ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {model.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-secondary px-2 py-1 rounded">
                            {model.type.toUpperCase()}
                          </span>
                          {model.isAvailable ? (
                            <span className="text-xs text-green-600">Available</span>
                          ) : (
                            <span className="text-xs text-red-600">Not Available</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {!model.isAvailable && model.type === 'cli' && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                        <p className="font-medium text-yellow-800">Setup Required</p>
                        <p className="text-yellow-700 mt-1">
                          Install Claude Code CLI: <code>npm install -g @anthropic/claude</code>
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}