import React, { useState, useEffect } from 'react';
import { AlertTriangle, Settings, ExternalLink, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  agentFlowControlService, 
  type FlowControlResult, 
  type AgentRequest,
  type IntegrationCheck 
} from '@/services/agentFlowControlService';

interface AgentFlowControllerProps {
  userMessage: string;
  appId?: number;
  onProceed: () => void;
  onBlock: (reason: string) => void;
  children?: React.ReactNode;
}

export function AgentFlowController({ 
  userMessage, 
  appId, 
  onProceed, 
  onBlock, 
  children 
}: AgentFlowControllerProps) {
  const [flowResult, setFlowResult] = useState<FlowControlResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    checkFlowControl();
  }, [userMessage, appId]);

  const checkFlowControl = async () => {
    if (!userMessage.trim()) return;
    
    setIsChecking(true);
    try {
      const request = agentFlowControlService.analyzeRequest(userMessage, appId);
      const result = await agentFlowControlService.checkFlowControl(request);
      setFlowResult(result);

      if (result.shouldProceed) {
        onProceed();
      } else {
        onBlock(result.message);
      }
    } catch (error) {
      console.error('Flow control check failed:', error);
      onProceed(); // Proceed on error to avoid blocking user
    } finally {
      setIsChecking(false);
    }
  };

  const handleBypassBlock = () => {
    onProceed();
  };

  const openSettings = () => {
    // This would open the settings/integrations page
    console.log('Open settings/integrations');
  };

  if (isChecking) {
    return (
      <div className="flex items-center gap-2 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
        <Clock className="w-4 h-4 animate-spin" />
        <span className="text-sm">Checking integration requirements...</span>
      </div>
    );
  }

  if (!flowResult || flowResult.shouldProceed) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-4">
      <Alert variant="default" className="border-amber-200 bg-amber-50 dark:bg-amber-950">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          Integration Setup Required
          <Badge variant="outline" className="ml-2">
            {flowResult.missingIntegrations.length} missing
          </Badge>
        </AlertTitle>
        <AlertDescription>
          <p className="mb-3">{flowResult.message}</p>
          
          {flowResult.instructions && flowResult.instructions.length > 0 && (
            <div className="mb-4">
              <p className="font-medium mb-2">Setup Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                {flowResult.instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <Button onClick={openSettings} className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Open Settings
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2"
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>

            {flowResult.availableAlternatives && flowResult.availableAlternatives.length > 0 && (
              <Button 
                variant="secondary" 
                onClick={handleBypassBlock}
                className="flex items-center gap-2"
              >
                Continue with Alternatives
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Integration Status Details</CardTitle>
            <CardDescription>
              Current status of required integrations for your request
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {flowResult.missingIntegrations.map((integration, index) => (
                <IntegrationStatusCard key={index} integration={integration} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {flowResult.availableAlternatives && flowResult.availableAlternatives.length > 0 && showDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Available Alternatives</CardTitle>
            <CardDescription>
              I can proceed with these alternatives if you prefer not to set up integrations now
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {flowResult.availableAlternatives.map((alternative, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{alternative}</span>
                </li>
              ))}
            </ul>
            
            <Button 
              onClick={handleBypassBlock} 
              className="w-full mt-4"
              variant="outline"
            >
              Proceed with Alternatives
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface IntegrationStatusCardProps {
  integration: IntegrationCheck;
}

function IntegrationStatusCard({ integration }: IntegrationStatusCardProps) {
  const getStatusIcon = () => {
    if (integration.configured) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  };

  const getStatusBadge = () => {
    if (integration.configured) {
      return <Badge variant="outline" className="text-green-600 border-green-200">Configured</Badge>;
    }
    if (integration.required) {
      return <Badge variant="outline" className="text-red-600 border-red-200">Required</Badge>;
    }
    return <Badge variant="outline" className="text-amber-600 border-amber-200">Recommended</Badge>;
  };

  const getServiceBadge = () => {
    if (!integration.service) return null;
    
    const serviceLabels = {
      supabase: 'Supabase',
      vercel: 'Vercel', 
      github: 'GitHub',
      custom: 'Custom',
    };

    return (
      <Badge variant="secondary" className="ml-2">
        {serviceLabels[integration.service]}
      </Badge>
    );
  };

  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg">
      {getStatusIcon()}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium capitalize">{integration.type.replace('_', ' ')}</h4>
          {getStatusBadge()}
          {getServiceBadge()}
        </div>
        
        {integration.message && (
          <p className="text-sm text-muted-foreground mb-2">{integration.message}</p>
        )}
        
        {integration.actionRequired && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            <strong>Action needed:</strong> {integration.actionRequired}
          </p>
        )}
      </div>
    </div>
  );
}

export default AgentFlowController;