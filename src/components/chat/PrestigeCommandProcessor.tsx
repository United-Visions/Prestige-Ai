import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, RotateCcw, HardDriveIcon, Zap } from 'lucide-react';

interface PrestigeCommandProps {
  type: 'rebuild' | 'restart' | 'refresh';
}

const commandConfig = {
  rebuild: {
    name: 'Rebuild',
    description: 'Rebuild the app from scratch',
    details: 'This will delete node_modules, reinstall packages, and restart the app server.',
    icon: HardDriveIcon,
    color: 'border-orange-300 bg-orange-50',
    iconColor: 'text-orange-600',
    buttonColor: 'bg-orange-600 hover:bg-orange-700 text-white',
  },
  restart: {
    name: 'Restart',
    description: 'Restart the app server',
    details: 'This will restart the development server to apply any configuration changes.',
    icon: RotateCcw,
    color: 'border-blue-300 bg-blue-50',
    iconColor: 'text-blue-600',
    buttonColor: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  refresh: {
    name: 'Refresh',
    description: 'Refresh the app preview',
    details: 'This will refresh the preview window to show the latest changes.',
    icon: RefreshCw,
    color: 'border-green-300 bg-green-50',
    iconColor: 'text-green-600',
    buttonColor: 'bg-green-600 hover:bg-green-700 text-white',
  },
};

export function PrestigeCommandProcessor({ type }: PrestigeCommandProps) {
  const config = commandConfig[type];
  const Icon = config.icon;

  const handleCommandClick = () => {
    // Execute the appropriate command
    // In a real implementation, this would:
    // 1. Send command to the app management service
    // 2. Show loading states
    // 3. Handle success/error feedback
    
    console.log(`Executing ${type} command...`);
    
    // Emit custom event that the app can listen for
    window.dispatchEvent(new CustomEvent('prestigeCommand', { 
      detail: { type, timestamp: Date.now() }
    }));
    
    // For demo purposes, show feedback
    switch (type) {
      case 'rebuild':
        alert('Rebuilding app...\n\nThis would:\n1. Delete node_modules\n2. Run npm install\n3. Start the dev server');
        break;
      case 'restart':
        alert('Restarting app server...\n\nThis would restart the development server.');
        break;
      case 'refresh':
        alert('Refreshing preview...\n\nThis would refresh the app preview.');
        break;
    }
  };

  return (
    <Alert className={`${config.color} border my-4`}>
      <Icon className={`h-4 w-4 ${config.iconColor}`} />
      <AlertDescription>
        <div className="space-y-3">
          <div>
            <div className="font-semibold text-gray-900">
              {config.name} Required
            </div>
            <div className="text-sm text-gray-700 mt-1">
              {config.details}
            </div>
          </div>
          
          <Button 
            onClick={handleCommandClick}
            className={`w-full ${config.buttonColor}`}
            size="sm"
          >
            <Icon className="w-4 h-4 mr-2" />
            {config.name} Now
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}