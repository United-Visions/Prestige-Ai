import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Github, 
  Database, 
  Cloud, 
  ExternalLink,
  Check,
  AlertCircle,
  Loader,
  Settings,
  Key,
  Server
} from 'lucide-react';
import useAppStore from '@/stores/appStore';

export function IntegrationsSettings() {
  const {
    githubStatus,
    vercelStatus,
    supabaseStatus,
    checkIntegrationStatuses,
    connectGitHub,
    connectVercel,
    connectSupabase,
    disconnectGitHub,
    disconnectVercel,
    disconnectSupabase
  } = useAppStore();
  
  const [autoFixEnabled, setAutoFixEnabled] = useState(true);
  const [flowControlEnabled, setFlowControlEnabled] = useState(true);

  useEffect(() => {
    checkIntegrationStatuses();
  }, [checkIntegrationStatuses]);

  const IntegrationCard = ({ 
    title, 
    description, 
    icon: Icon, 
    status, 
    onConnect, 
    onDisconnect 
  }: {
    title: string;
    description: string;
    icon: React.ComponentType<any>;
    status: any; // Using any for now to avoid type conflicts
    onConnect: () => void;
    onDisconnect?: () => void;
  }) => (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className="w-6 h-6 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status.loading && <Loader className="w-4 h-4 animate-spin" />}
            {status.connected ? (
              <Badge variant="default" className="gap-1">
                <Check className="w-3 h-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                Disconnected
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {status.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{status.error}</AlertDescription>
          </Alert>
        )}
        
        {status.connected && status.user && (
          <div className="text-sm text-muted-foreground">
            Connected as: <span className="font-medium">{status.user.login || status.user.name}</span>
          </div>
        )}

        <div className="flex gap-2">
          {!status.connected ? (
            <Button 
              onClick={onConnect} 
              disabled={status.loading}
              size="sm"
            >
              {status.loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>Connect {title}</>
              )}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {/* Test connection */}}
              >
                Test Connection
              </Button>
              {onDisconnect && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onDisconnect}
                >
                  Disconnect
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Integrations</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Connect external services to enable automatic deployments, database provisioning, and more.
        </p>
      </div>

      {/* Integration Cards */}
      <div className="space-y-4">
        <IntegrationCard
          title="GitHub"
          description="Connect to GitHub for repository management and code deployment"
          icon={Github}
          status={githubStatus}
          onConnect={connectGitHub}
          onDisconnect={disconnectGitHub}
        />

        <IntegrationCard
          title="Vercel"
          description="Deploy applications instantly with Vercel's platform"
          icon={Cloud}
          status={vercelStatus}
          onConnect={() => {
            // For now, show that Vercel integration needs manual setup
            console.log('Vercel integration needs manual token setup');
          }}
          onDisconnect={disconnectVercel}
        />

        <IntegrationCard
          title="Supabase"
          description="Create and manage databases with Supabase"
          icon={Database}
          status={supabaseStatus}
          onConnect={() => {
            // For now, show that Supabase integration needs manual setup
            console.log('Supabase integration needs manual token setup');
          }}
          onDisconnect={disconnectSupabase}
        />
      </div>

      {/* Agent Behavior Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Agent Behavior
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure how the AI agent handles integrations and code generation.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="flow-control">Smart Flow Control</Label>
              <p className="text-sm text-muted-foreground">
                Block AI generation when integrations are needed instead of creating mock code
              </p>
            </div>
            <Switch
              id="flow-control"
              checked={flowControlEnabled}
              onCheckedChange={setFlowControlEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-fix">Auto-Fix Code</Label>
              <p className="text-sm text-muted-foreground">
                Automatically detect and fix TypeScript and ESLint errors
              </p>
            </div>
            <Switch
              id="auto-fix"
              checked={autoFixEnabled}
              onCheckedChange={setAutoFixEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Integration Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Total Integrations:</span>
              <span className="font-medium">3</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Connected:</span>
              <span className="font-medium text-green-600">
                {[githubStatus, vercelStatus, supabaseStatus].filter(s => s.connected).length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Pending:</span>
              <span className="font-medium text-yellow-600">
                {[githubStatus, vercelStatus, supabaseStatus].filter(s => s.loading).length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}