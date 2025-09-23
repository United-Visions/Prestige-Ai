import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  Package, 
  RefreshCw, 
  Play, 
  X, 
  CheckCircle, 
  Clock, 
  Wrench,
  Terminal,
  Download
} from 'lucide-react';
import { ErrorReport } from '@/services/errorDetectionService';
import { cn } from '@/lib/utils';

interface ErrorResolutionBlockProps {
  errorReport: ErrorReport;
  appId: number;
  appName?: string;
  isFixing?: boolean;
  onAutoFix: () => void;
  onInstallPackages: (packages: string[]) => void;
  onRestartApp: () => void;
  onDismiss: () => void;
  onContinuePlan?: () => void;
  className?: string;
}

interface SuggestedFix {
  type: 'install-packages' | 'restart' | 'auto-fix';
  title: string;
  description: string;
  packages?: string[];
  icon: React.ComponentType<{ className?: string }>;
}

export function ErrorResolutionBlock({
  errorReport,
  appId,
  appName = 'your app',
  isFixing = false,
  onAutoFix,
  onInstallPackages,
  onRestartApp,
  onDismiss,
  onContinuePlan,
  className
}: ErrorResolutionBlockProps) {
  const [selectedFix, setSelectedFix] = useState<SuggestedFix | null>(null);

  // Analyze errors and suggest fixes
  const suggestedFixes: SuggestedFix[] = React.useMemo(() => {
    const fixes: SuggestedFix[] = [];
    const missingPackages: string[] = [];

    // Check for missing package imports
    errorReport.buildErrors.forEach(error => {
      const importMatch = error.message.match(/Failed to resolve import "([^"]+)"/);
      if (importMatch) {
        const packageName = importMatch[1];
        if (packageName.startsWith('@')) {
          // Handle scoped packages like @radix-ui/react-label
          const scopedPackage = packageName.split('/').slice(0, 2).join('/');
          if (!missingPackages.includes(scopedPackage)) {
            missingPackages.push(scopedPackage);
          }
        } else {
          // Handle regular packages
          const basePackage = packageName.split('/')[0];
          if (!missingPackages.includes(basePackage)) {
            missingPackages.push(basePackage);
          }
        }
      }
    });

    // Add package installation fix if needed
    if (missingPackages.length > 0) {
      fixes.push({
        type: 'install-packages',
        title: `Install ${missingPackages.length} missing package${missingPackages.length > 1 ? 's' : ''}`,
        description: `Add ${missingPackages.join(', ')} to resolve import errors`,
        packages: missingPackages,
        icon: Package
      });
    }

    // Add restart fix
    fixes.push({
      type: 'restart',
      title: 'Restart application',
      description: 'Restart the development server to apply changes',
      icon: RefreshCw
    });

    // Add auto-fix for general errors
    if (errorReport.buildErrors.length > 0 || errorReport.runtimeErrors.length > 0) {
      fixes.push({
        type: 'auto-fix',
        title: 'Auto-fix with AI',
        description: 'Let AI analyze and fix these errors automatically',
        icon: Wrench
      });
    }

    return fixes;
  }, [errorReport]);

  const handleFixSelection = (fix: SuggestedFix) => {
    setSelectedFix(fix);
    
    switch (fix.type) {
      case 'install-packages':
        if (fix.packages) {
          onInstallPackages(fix.packages);
        }
        break;
      case 'restart':
        onRestartApp();
        break;
      case 'auto-fix':
        onAutoFix();
        break;
    }
  };

  const totalErrors = errorReport.buildErrors.length + errorReport.runtimeErrors.length;

  return (
    <Card className={cn(
      "w-full border-red-200 bg-red-50/50 shadow-lg",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <CardTitle className="text-lg text-red-700">
              Errors Detected in {appName}
            </CardTitle>
            <Badge variant="destructive" className="text-xs">
              {totalErrors} error{totalErrors > 1 ? 's' : ''}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {isFixing && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Clock className="h-4 w-4 animate-spin" />
            Auto Mode paused - fixing errors...
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Summary */}
        <div className="space-y-3">
          {errorReport.buildErrors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Build Errors:</h4>
              <div className="space-y-2">
                {errorReport.buildErrors.slice(0, 3).map((error, index) => (
                  <div key={index} className="text-xs font-mono bg-white p-3 rounded border-l-2 border-red-400">
                    <div className="text-red-600 font-semibold">
                      {error.file}:{error.line}:{error.column}
                    </div>
                    <div className="text-gray-700 mt-1">{error.message}</div>
                  </div>
                ))}
                {errorReport.buildErrors.length > 3 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    ... and {errorReport.buildErrors.length - 3} more error{errorReport.buildErrors.length - 3 > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )}

          {errorReport.runtimeErrors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Runtime Errors:</h4>
              <div className="space-y-2">
                {errorReport.runtimeErrors.slice(0, 2).map((error, index) => (
                  <div key={index} className="text-xs font-mono bg-white p-3 rounded border-l-2 border-orange-400">
                    <div className="text-orange-600 font-semibold">Runtime Error</div>
                    <div className="text-gray-700 mt-1">{error.payload.message}</div>
                  </div>
                ))}
                {errorReport.runtimeErrors.length > 2 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    ... and {errorReport.runtimeErrors.length - 2} more error{errorReport.runtimeErrors.length - 2 > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Suggested Fixes */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Suggested Fixes:</h4>
          <div className="space-y-2">
            {suggestedFixes.map((fix, index) => (
              <Button
                key={index}
                variant={selectedFix?.type === fix.type ? "default" : "outline"}
                size="sm"
                onClick={() => handleFixSelection(fix)}
                disabled={isFixing}
                className="w-full justify-start h-auto p-3"
              >
                <fix.icon className="h-4 w-4 mr-2 flex-shrink-0" />
                <div className="text-left flex-1">
                  <div className="font-medium">{fix.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{fix.description}</div>
                </div>
                {selectedFix?.type === fix.type && (
                  <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Continue Plan Button */}
        {onContinuePlan && !isFixing && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Auto Mode is paused until errors are resolved
              </div>
              <Button
                onClick={onContinuePlan}
                size="sm"
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Continue Plan
              </Button>
            </div>
          </>
        )}

        {/* Progress Indicator */}
        {isFixing && (
          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded">
            <Terminal className="h-4 w-4" />
            <span>Applying fixes... The app will restart automatically.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}