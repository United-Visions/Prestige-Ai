import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Github, Database, Globe, Settings, CheckCircle } from 'lucide-react';
import { IntegrationSetupDialog } from '@/components/dialogs/IntegrationSetupDialog';

interface PrestigeAddIntegrationProps {
  provider: 'github' | 'supabase' | 'vercel';
  children?: React.ReactNode;
  isEnabled?: boolean;
}

const providerConfig = {
  github: {
    name: 'GitHub',
    icon: Github,
    description: 'Version control and repository management',
    setupText: 'Set up GitHub integration to enable version control, deployment automation, and collaborative development features.',
    color: 'border-gray-300 bg-gray-50',
    iconColor: 'text-gray-600',
    buttonColor: 'bg-gray-800 hover:bg-gray-900 text-white',
  },
  supabase: {
    name: 'Supabase',
    icon: Database,
    description: 'Authentication, database, and backend services',
    setupText: 'Set up Supabase integration to enable authentication, database operations, and serverless functions.',
    color: 'border-green-300 bg-green-50',
    iconColor: 'text-green-600',
    buttonColor: 'bg-green-600 hover:bg-green-700 text-white',
  },
  vercel: {
    name: 'Vercel',
    icon: Globe,
    description: 'Deployment and hosting platform',
    setupText: 'Set up Vercel integration to enable automatic deployments, serverless functions, and production hosting.',
    color: 'border-black bg-gray-50',
    iconColor: 'text-black',
    buttonColor: 'bg-black hover:bg-gray-800 text-white',
  },
};

export function PrestigeAddIntegration({ 
  provider, 
  children, 
  isEnabled = false 
}: PrestigeAddIntegrationProps) {
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const config = provider && (provider in providerConfig)
    ? providerConfig[provider]
    : {
        name: 'Integration',
        icon: Settings,
        description: 'Add an integration',
        setupText: 'Configure integration settings to continue.',
        color: 'border-gray-300 bg-gray-50',
        iconColor: 'text-gray-600',
        buttonColor: 'bg-gray-800 hover:bg-gray-900 text-white',
      };
  const Icon = config.icon || Settings;

  const handleSetupClick = () => {
    setSetupDialogOpen(true);
  };

  const handleSetupSuccess = () => {
    console.log(`${provider} integration setup completed successfully`);
    // In a real implementation, this would:
    // 1. Update app integration status
    // 2. Refresh the page to show integrated state
    // 3. Trigger a re-detection of integrations
    setSetupDialogOpen(false);
  };

  if (isEnabled) {
    return (
      <Alert className="border-green-300 bg-green-50 my-4">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            <span className="font-semibold">{config.name} integration complete</span>
          </div>
          <p className="text-sm mt-1">
            This app is connected to {config.name}. You can now use {config.description.toLowerCase()}.
          </p>
          <p className="text-sm mt-1 opacity-75">Click "Keep going" to continue with your request.</p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className={`${config.color} border my-4`}>
      <Settings className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
            <div>
              <div className="font-semibold text-gray-900">
                Integrate with {config.name}?
              </div>
              <div className="text-sm text-gray-600">
                {config.description}
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-700">
            {config.setupText}
          </div>
          
          {children && (
            <div className="text-xs text-gray-600 bg-white/50 rounded p-2 border">
              {children}
            </div>
          )}
          
          <Button 
            onClick={handleSetupClick}
            className={`w-full ${config.buttonColor}`}
            size="sm"
          >
            <Icon className="w-4 h-4 mr-2" />
            Set up {config.name}
          </Button>
        </div>
      </AlertDescription>
      
      <IntegrationSetupDialog
        isOpen={setupDialogOpen}
        onClose={() => setSetupDialogOpen(false)}
        provider={provider}
        onSuccess={handleSetupSuccess}
      />
    </Alert>
  );
}