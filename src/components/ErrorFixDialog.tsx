import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, MessageCircle, Zap, Settings, CheckCircle } from 'lucide-react';
import { ErrorReport } from '@/services/errorDetectionService';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorFixDialogProps {
  isOpen: boolean;
  onClose: () => void;
  errorReport: ErrorReport | null;
  onSendToChat: () => void;
  onAutoFix: () => void;
  onOpenApiKeys: () => void;
  hasValidApiKey: boolean;
  isFixing: boolean;
  currentAppName?: string;
}

export function ErrorFixDialog({
  isOpen,
  onClose,
  errorReport,
  onSendToChat,
  onAutoFix,
  onOpenApiKeys,
  hasValidApiKey,
  isFixing,
  currentAppName = 'your app'
}: ErrorFixDialogProps) {
  const [countdown, setCountdown] = useState(10);
  const [showCountdown, setShowCountdown] = useState(false);

  useEffect(() => {
    if (isOpen && errorReport?.hasErrors && hasValidApiKey) {
      setShowCountdown(true);
      setCountdown(10);
      
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setShowCountdown(false);
            onAutoFix();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, errorReport?.hasErrors, hasValidApiKey, onAutoFix]);

  const totalErrors = errorReport ? errorReport.buildErrors.length + errorReport.runtimeErrors.length : 0;

  if (!errorReport?.hasErrors) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-lg font-semibold">Errors Detected in {currentAppName}</div>
              <div className="text-sm font-normal text-muted-foreground">
                Found {totalErrors} error{totalErrors > 1 ? 's' : ''} that need attention
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Your application has encountered errors while running. Choose how you'd like to handle them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Auto-fix countdown */}
          {showCountdown && hasValidApiKey && (
            <Alert className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-xl animate-pulse shadow-lg">
                    {countdown}
                  </div>
                  {/* Progress ring */}
                  <svg className="absolute top-0 left-0 w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      className="text-orange-200"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 20}`}
                      strokeDashoffset={`${2 * Math.PI * 20 * (countdown / 10)}`}
                      className="text-orange-500 transition-all duration-1000 ease-linear"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-orange-800 mb-1">
                    Auto-Fix Starting Soon
                  </div>
                  <div className="text-orange-700 text-sm">
                    Automatically fixing errors in <span className="font-bold">{countdown}</span> seconds...
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 w-full bg-orange-200 rounded-full h-1">
                    <div 
                      className="bg-gradient-to-r from-orange-500 to-amber-500 h-1 rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: `${((10 - countdown) / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCountdown(false);
                    setCountdown(0);
                  }}
                  className="border-orange-300 hover:bg-orange-100 text-orange-700 hover:text-orange-800"
                >
                  Cancel
                </Button>
              </div>
            </Alert>
          )}

          {/* Error Summary */}
          <div className="grid grid-cols-2 gap-4">
            {errorReport.buildErrors.length > 0 && (
              <div className="p-4 border rounded-lg bg-red-50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="font-medium text-red-800">Build Errors</span>
                  <Badge variant="destructive">{errorReport.buildErrors.length}</Badge>
                </div>
                <div className="text-sm text-red-700">
                  Compilation and syntax errors preventing your app from running properly.
                </div>
              </div>
            )}

            {errorReport.runtimeErrors.length > 0 && (
              <div className="p-4 border rounded-lg bg-orange-50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="font-medium text-orange-800">Runtime Errors</span>
                  <Badge variant="secondary" className="bg-orange-200 text-orange-800">
                    {errorReport.runtimeErrors.length}
                  </Badge>
                </div>
                <div className="text-sm text-orange-700">
                  Issues that occur while your app is running.
                </div>
              </div>
            )}
          </div>

          {/* Error Details */}
          <div className="max-h-48 overflow-y-auto space-y-2 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm text-gray-800 mb-2">Error Details:</h4>
            
            {errorReport.buildErrors.map((error, index) => (
              <div key={`build-${index}`} className="text-xs font-mono bg-white p-3 rounded border-l-2 border-red-400">
                <div className="text-red-600 font-semibold">
                  {error.file}:{error.line}:{error.column}
                </div>
                <div className="text-gray-700 mt-1">{error.message}</div>
              </div>
            ))}
            
            {errorReport.runtimeErrors.map((error, index) => (
              <div key={`runtime-${index}`} className="text-xs font-mono bg-white p-3 rounded border-l-2 border-orange-400">
                <div className="text-orange-600 font-semibold">Runtime Error</div>
                <div className="text-gray-700 mt-1">{error.payload?.message}</div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex gap-3 sm:justify-start">
          {!hasValidApiKey && (
            <Button
              onClick={onOpenApiKeys}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Settings className="w-4 h-4 mr-2" />
              Set API Key to Continue
            </Button>
          )}
          
          {hasValidApiKey && (
            <>
              <Button
                variant="outline"
                onClick={onSendToChat}
                className="flex-1"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Send to Chat
              </Button>
              
              <Button
                onClick={onAutoFix}
                disabled={isFixing}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
              >
                <Zap className="w-4 h-4 mr-2" />
                {isFixing ? 'Fixing...' : 'Fix in Background'}
              </Button>
            </>
          )}
          
          <Button
            variant="secondary"
            onClick={onClose}
            className="px-6"
          >
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}