import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, Database, Github, Cloud, Settings, AlertCircle, ExternalLink } from "lucide-react";
import useAppStore from "@/stores/appStore";

export interface IntegrationConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  required: boolean;
  enabled: boolean;
  connected: boolean;
  loading: boolean;
  error?: string;
}

interface IntegrationSelectorProps {
  selectedIntegrations?: string[];
  onIntegrationsSelect: (integrations: string[]) => void;
  children?: React.ReactNode;
}

export function IntegrationSelector({ 
  selectedIntegrations = [], 
  onIntegrationsSelect, 
  children 
}: IntegrationSelectorProps) {
  const [open, setOpen] = useState(false);
  const [currentSelections, setCurrentSelections] = useState<string[]>(selectedIntegrations);
  
  const { githubStatus, vercelStatus, supabaseStatus } = useAppStore();

  const integrations: IntegrationConfig[] = [
    {
      id: 'github',
      name: 'GitHub',
      description: 'Repository management, version control, and automated deployments',
      icon: Github,
      required: false,
      enabled: currentSelections.includes('github'),
      connected: githubStatus.connected,
      loading: githubStatus.loading,
      error: githubStatus.error
    },
    {
      id: 'vercel',
      name: 'Vercel',
      description: 'Instant deployments, serverless functions, and global CDN',
      icon: Cloud,
      required: false,
      enabled: currentSelections.includes('vercel'),
      connected: vercelStatus.connected,
      loading: vercelStatus.loading,
      error: vercelStatus.error
    },
    {
      id: 'supabase',
      name: 'Supabase',
      description: 'PostgreSQL database, authentication, and real-time subscriptions',
      icon: Database,
      required: false,
      enabled: currentSelections.includes('supabase'),
      connected: supabaseStatus.connected,
      loading: supabaseStatus.loading,
      error: supabaseStatus.error
    }
  ];

  const handleSelect = () => {
    onIntegrationsSelect(currentSelections);
    setOpen(false);
  };

  const handleIntegrationToggle = (integrationId: string, checked: boolean) => {
    if (checked) {
      setCurrentSelections(prev => [...prev, integrationId]);
    } else {
      setCurrentSelections(prev => prev.filter(id => id !== integrationId));
    }
  };

  const connectedCount = integrations.filter(i => i.connected).length;
  const selectedCount = currentSelections.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Integrations ({selectedCount})
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            Choose Integrations
          </DialogTitle>
          <DialogDescription>
            Select which external services you want to integrate with this app. 
            Connect services in Preferences first to enable them.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Status Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{connectedCount}</div>
              <div className="text-sm text-muted-foreground">Connected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{selectedCount}</div>
              <div className="text-sm text-muted-foreground">Selected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{integrations.length}</div>
              <div className="text-sm text-muted-foreground">Available</div>
            </div>
          </div>

          {/* Integration Cards */}
          <div className="space-y-3">
            {integrations.map((integration) => {
              const Icon = integration.icon;
              const isEnabled = currentSelections.includes(integration.id);
              
              return (
                <Card
                  key={integration.id}
                  className={`
                    transition-all border-2 cursor-pointer
                    ${isEnabled 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                    }
                    ${!integration.connected ? "opacity-75" : ""}
                  `}
                  onClick={() => handleIntegrationToggle(integration.id, !isEnabled)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isEnabled}
                            onChange={() => {}} // Handled by card click
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <Icon className={`w-6 h-6 ${integration.connected ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {integration.name}
                            {integration.connected ? (
                              <Badge variant="default" className="text-xs gap-1">
                                <Check className="w-3 h-3" />
                                Connected
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Not Connected
                              </Badge>
                            )}
                          </CardTitle>
                        </div>
                      </div>
                      {isEnabled && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <CardDescription className="text-sm leading-relaxed mb-3">
                      {integration.description}
                    </CardDescription>
                    
                    {integration.error && (
                      <Alert variant="destructive" className="mb-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {integration.error}
                        </AlertDescription>
                      </Alert>
                    )}

                    {!integration.connected && (
                      <div className="text-xs text-muted-foreground">
                        <ExternalLink className="w-3 h-3 inline mr-1" />
                        Connect in Preferences → Integrations to enable this service
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Help Text */}
          {selectedCount === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No integrations selected. Your app will be created without external services.
                You can add integrations later through the app settings.
              </AlertDescription>
            </Alert>
          )}

          {selectedCount > 0 && connectedCount < selectedCount && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Some selected integrations are not connected. Make sure to connect them in 
                Preferences → Integrations before creating your app.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSelect} className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Select Integrations ({selectedCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}