import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, MessageCircle, Wrench, Star, Sparkles } from 'lucide-react';
import { EnhancedModelPicker } from './EnhancedModelPicker';
import { useModelPreferencesStore } from '@/stores/modelPreferencesStore';
import { LargeLanguageModel } from '@/lib/models';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ModelPreferencesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApiKeyDialogOpen?: () => void;
}

export function ModelPreferencesDialog({
  isOpen,
  onClose,
  onApiKeyDialogOpen,
}: ModelPreferencesDialogProps) {
  const {
    defaultChatModel,
    defaultFixModel,
    useFixModelForChat,
    useChatModelForFix,
    setDefaultChatModel,
    setDefaultFixModel,
    setUseFixModelForChat,
    setUseChatModelForFix,
    clearPreferences,
  } = useModelPreferencesStore();

  const [tempChatModel, setTempChatModel] = useState<LargeLanguageModel | null>(defaultChatModel || null);
  const [tempFixModel, setTempFixModel] = useState<LargeLanguageModel | null>(defaultFixModel || null);
  const [tempUseFixForChat, setTempUseFixForChat] = useState(useFixModelForChat);
  const [tempUseChatForFix, setTempUseChatForFix] = useState(useChatModelForFix);

  const handleSave = () => {
    if (tempChatModel) setDefaultChatModel(tempChatModel);
    if (tempFixModel) setDefaultFixModel(tempFixModel);
    setUseFixModelForChat(tempUseFixForChat);
    setUseChatModelForFix(tempUseChatForFix);
    onClose();
  };

  const handleReset = () => {
    setTempChatModel(null);
    setTempFixModel(null);
    setTempUseFixForChat(false);
    setTempUseChatForFix(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-lg font-semibold">Model Preferences</div>
              <div className="text-sm font-normal text-muted-foreground">
                Configure default models for different contexts
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Set your preferred AI models for chat conversations and error fixing. You can have different models for different purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Chat Model Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-green-100 to-emerald-100 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Chat Model</h3>
                <p className="text-sm text-muted-foreground">
                  Default model for regular conversations and app creation
                </p>
              </div>
            </div>

            <div className="ml-11 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="chat-model">Default Chat Model</Label>
                <EnhancedModelPicker
                  selectedModel={tempChatModel || { name: 'Select a Chat Model', provider: 'auto' } as any}
                  onModelSelect={setTempChatModel}
                  onApiKeyDialogOpen={onApiKeyDialogOpen}
                  className="w-full"
                />
              </div>
              
              {tempFixModel && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="use-fix-for-chat"
                    checked={tempUseFixForChat}
                    onCheckedChange={setTempUseFixForChat}
                  />
                  <Label htmlFor="use-fix-for-chat" className="text-sm">
                    Use Fix Model for chat conversations too
                  </Label>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Fix Model Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-100 to-amber-100 flex items-center justify-center">
                <Wrench className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Fix Model</h3>
                <p className="text-sm text-muted-foreground">
                  Specialized model for error detection and automatic fixes
                </p>
              </div>
            </div>

            <div className="ml-11 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="fix-model">Default Fix Model</Label>
                <EnhancedModelPicker
                  selectedModel={tempFixModel || { name: 'Select a Fix Model', provider: 'auto' } as any}
                  onModelSelect={setTempFixModel}
                  onApiKeyDialogOpen={onApiKeyDialogOpen}
                  className="w-full"
                />
              </div>
              
              {tempChatModel && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="use-chat-for-fix"
                    checked={tempUseChatForFix}
                    onCheckedChange={setTempUseChatForFix}
                  />
                  <Label htmlFor="use-chat-for-fix" className="text-sm">
                    Use Chat Model for error fixing too
                  </Label>
                </div>
              )}
            </div>
          </div>

          {/* Info Alert */}
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              <strong>Pro Tip:</strong> You can set different models for different purposes. For example, use a powerful model like Claude Sonnet 4 for complex fixes, and a faster model like GPT-4-mini for regular chat.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex gap-3 sm:justify-between">
          <Button
            variant="ghost"
            onClick={handleReset}
            className="text-muted-foreground"
          >
            Reset to Defaults
          </Button>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              Save Preferences
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}