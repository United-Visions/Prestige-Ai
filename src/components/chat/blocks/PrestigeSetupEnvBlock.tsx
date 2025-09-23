import React, { useState, useEffect } from "react";
import { Key, ChevronDown, ChevronUp, Loader, CheckCircle, ExternalLink, SkipForward } from "lucide-react";
import { PrestigeBlockProps, PrestigeBlockState } from "./PrestigeBlockTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { environmentSyncService } from "@/services/environmentSyncService";
import { resolveAppPaths } from "@/utils/appPathResolver";
import useAppStore from "@/stores/appStore";

interface PrestigeSetupEnvBlockProps extends PrestigeBlockProps {
  children?: React.ReactNode;
  service?: string;
  apiKey?: string;
  description?: string;
}

export const PrestigeSetupEnvBlock: React.FC<PrestigeSetupEnvBlockProps> = ({
  children,
  node,
  service: propService,
  apiKey: propApiKey,
  description: propDescription
}) => {
  const state = node?.properties?.state as PrestigeBlockState;
  const service = propService || node?.properties?.service || "Unknown Service";
  const apiKey = propApiKey || node?.properties?.apiKey || "API_KEY";
  const description = propDescription || node?.properties?.description;
  const inProgress = state === "pending";
  
  const [isExpanded, setIsExpanded] = useState(inProgress);
  const [userApiKey, setUserApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const { currentApp } = useAppStore();

  // Auto-collapse when transitioning from in-progress to not-in-progress
  useEffect(() => {
    if (!inProgress && isExpanded) {
      const timer = setTimeout(() => setIsExpanded(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [inProgress, isExpanded]);

  const handleSubmit = async () => {
    if (!userApiKey.trim() || !currentApp) return;
    
    setIsSubmitting(true);
    try {
      // Get app path
      const { filesPath } = await resolveAppPaths(currentApp);
      
      // Update environment variable
      await environmentSyncService.updateEnvironmentVariable(filesPath, apiKey, userApiKey.trim());
      
      console.log(`✅ Set up ${apiKey}=${userApiKey} for ${service}`);
      // The actual .env update is now handled properly
    } catch (error) {
      console.error('Failed to setup API key:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    setSkipped(true);
    console.log(`Skipped API key setup for ${service}`);
  };

  const getServiceUrl = (serviceName: string): string => {
    const serviceUrls: Record<string, string> = {
      'bible': 'https://api.scripture.api.bible/',
      'weather': 'https://openweathermap.org/api',
      'news': 'https://newsapi.org/',
      'maps': 'https://developers.google.com/maps',
      'gemini': 'https://aistudio.google.com/app/apikey',
      'openai': 'https://platform.openai.com/api-keys',
      'anthropic': 'https://console.anthropic.com/',
    };
    return serviceUrls[serviceName.toLowerCase()] || '#';
  };

  const getServiceInstructions = (serviceName: string): string[] => {
    const instructions: Record<string, string[]> = {
      'bible': [
        'Go to api.scripture.api.bible',
        'Sign up for a free account',
        'Generate your API key',
        'Copy and paste it below'
      ],
      'weather': [
        'Visit openweathermap.org',
        'Create a free account',
        'Get your API key from the dashboard',
        'Paste it below'
      ],
      'gemini': [
        'Go to Google AI Studio',
        'Sign in with your Google account',
        'Click "Create API key"',
        'Copy the generated key'
      ]
    };
    return instructions[serviceName.toLowerCase()] || [
      `Visit the ${serviceName} website`,
      'Sign up for an account',
      'Generate your API key',
      'Copy and paste it below'
    ];
  };

  return (
    <div className="my-4">
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key size={16} className="text-amber-600" />
              <CardTitle className="text-sm font-medium">
                API Key Setup Required
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {service}
              </Badge>
              {(inProgress || isSubmitting) && (
                <Loader size={14} className="animate-spin text-amber-500" />
              )}
              {state === "finished" && !skipped && (
                <CheckCircle size={14} className="text-green-500" />
              )}
              {skipped && (
                <SkipForward size={14} className="text-blue-500" />
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </Button>
          </div>
          <CardDescription className="text-xs">
            {description || `This app needs access to ${service} API to function properly.`}
          </CardDescription>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0">
            {!skipped && state !== "finished" && (
              <div className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md">
                  <h4 className="font-medium text-sm mb-2">How to get your {service} API key:</h4>
                  <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
                    {getServiceInstructions(service).map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="text-xs"
                    >
                      <a 
                        href={getServiceUrl(service)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1"
                      >
                        <ExternalLink size={12} />
                        Get API Key
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Enter your {service} API key:
                  </label>
                  <Input
                    type="password"
                    placeholder={`Your ${service} API key`}
                    value={userApiKey}
                    onChange={(e) => setUserApiKey(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <div className="text-xs text-muted-foreground">
                    This will be saved to your app's .env file as: <code>{apiKey}</code>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={!userApiKey.trim() || isSubmitting}
                    size="sm"
                    className="text-xs"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader size={12} className="animate-spin mr-1" />
                        Setting up...
                      </>
                    ) : (
                      'Setup API Key'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    size="sm"
                    className="text-xs"
                  >
                    <SkipForward size={12} className="mr-1" />
                    Skip for now
                  </Button>
                </div>
              </div>
            )}

            {skipped && (
              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
                <div className="flex items-center gap-2 text-sm">
                  <SkipForward size={14} className="text-blue-500" />
                  <span className="font-medium">API key setup skipped</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  The app will continue building. You can add the API key to your .env file later.
                </p>
              </div>
            )}

            {state === "finished" && !skipped && (
              <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-md">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle size={14} className="text-green-500" />
                  <span className="font-medium">API key configured successfully</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Added {apiKey} to your .env file. The app can now access {service} services.
                </p>
              </div>
            )}

            {children && (
              <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                {children}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};