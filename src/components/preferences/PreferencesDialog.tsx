import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Database, 
  Github, 
  Key, 
  Zap, 
  Palette, 
  Globe,
  Server,
  Cloud,
  ExternalLink,
  Check,
  AlertCircle
} from 'lucide-react';
import { IntegrationsSettings } from './IntegrationsSettings';

interface PreferencesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PreferencesDialog({ isOpen, onClose }: PreferencesDialogProps) {
  const [activeTab, setActiveTab] = useState('integrations');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Preferences
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="flex gap-6 h-full">
            {/* Sidebar */}
            <div className="w-48 flex-shrink-0">
              <TabsList className="flex flex-col h-auto w-full gap-1">
                <TabsTrigger 
                  value="integrations" 
                  className="w-full justify-start gap-2 h-10"
                >
                  <Database className="w-4 h-4" />
                  Integrations
                </TabsTrigger>
                <TabsTrigger 
                  value="models" 
                  className="w-full justify-start gap-2 h-10"
                >
                  <Key className="w-4 h-4" />
                  API Keys
                </TabsTrigger>
                <TabsTrigger 
                  value="appearance" 
                  className="w-full justify-start gap-2 h-10"
                >
                  <Palette className="w-4 h-4" />
                  Appearance
                </TabsTrigger>
                <TabsTrigger 
                  value="general" 
                  className="w-full justify-start gap-2 h-10"
                >
                  <Settings className="w-4 h-4" />
                  General
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <TabsContent value="integrations" className="mt-0">
                <IntegrationsSettings />
              </TabsContent>

              <TabsContent value="models" className="mt-0">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">API Keys</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Manage your API keys for different AI models and services.
                    </p>
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground text-center py-8">
                        API key management interface will be added here.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="appearance" className="mt-0">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Appearance</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Customize the look and feel of Prestige-AI.
                    </p>
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Theme and appearance settings will be added here.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="general" className="mt-0">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">General Settings</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure general application preferences.
                    </p>
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground text-center py-8">
                        General settings will be added here.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}