import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Loader, 
  AlertCircle, 
  Download, 
  Upload, 
  Database, 
  Github,
  Cloud,
  X,
  ExternalLink
} from 'lucide-react';

export interface DeploymentStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  error?: string;
  url?: string;
  icon: React.ComponentType<any>;
}

interface DeploymentProgressProps {
  isOpen: boolean;
  onClose: () => void;
  steps: DeploymentStep[];
  title: string;
  onCancel?: () => void;
}

export function DeploymentProgress({ 
  isOpen, 
  onClose, 
  steps, 
  title,
  onCancel
}: DeploymentProgressProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length;
  const overallProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  
  const currentStep = steps.find(s => s.status === 'running');
  const hasError = steps.some(s => s.status === 'error');
  const isCompleted = completedSteps === totalSteps && !hasError;
  const canClose = isCompleted || hasError;

  const getStepIcon = (step: DeploymentStep) => {
    const Icon = step.icon;
    
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'running':
        return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Icon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    if (hasError) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="w-3 h-3" />
          Failed
        </Badge>
      );
    }
    
    if (isCompleted) {
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle className="w-3 h-3" />
          Completed
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader className="w-3 h-3 animate-spin" />
        In Progress
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={canClose ? onClose : undefined}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              {title}
            </DialogTitle>
            <div className="flex items-center gap-3">
              {getStatusBadge()}
              {canClose && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Progress */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Overall Progress</span>
              <span className="text-muted-foreground">
                {completedSteps} of {totalSteps} steps completed
              </span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>

          {/* Current Step Highlight */}
          {currentStep && (
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                  <div className="flex-1">
                    <div className="font-medium text-blue-900 dark:text-blue-100">
                      {currentStep.name}
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-200">
                      {currentStep.description}
                    </div>
                    {currentStep.progress > 0 && (
                      <div className="mt-2">
                        <Progress value={currentStep.progress} className="h-2" />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step List */}
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`
                  flex items-center gap-3 p-3 rounded-lg transition-all
                  ${step.status === 'running' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                  ${step.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20' : ''}
                  ${step.status === 'error' ? 'bg-red-50 dark:bg-red-900/20' : ''}
                `}
              >
                <div className="flex-shrink-0">
                  {getStepIcon(step)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{step.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {step.description}
                  </div>
                  
                  {step.error && (
                    <div className="text-sm text-red-600 mt-1">
                      {step.error}
                    </div>
                  )}
                  
                  {step.url && step.status === 'completed' && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-green-600 hover:text-green-700"
                      onClick={() => window.open(step.url, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View Result
                    </Button>
                  )}
                </div>

                {step.status === 'running' && step.progress > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {step.progress}%
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              {isCompleted && (
                <span className="text-green-600 font-medium">
                  All steps completed successfully!
                </span>
              )}
              {hasError && (
                <span className="text-red-600 font-medium">
                  Deployment failed. Check the errors above.
                </span>
              )}
              {!isCompleted && !hasError && (
                <span>
                  Deployment in progress...
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              {onCancel && !isCompleted && !hasError && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              {canClose && (
                <Button onClick={onClose}>
                  {isCompleted ? 'Done' : 'Close'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Predefined step templates
export const createTemplateDownloadSteps = (templateName: string): DeploymentStep[] => [
  {
    id: 'fetch-template',
    name: 'Fetching Template',
    description: `Downloading ${templateName} template from repository`,
    status: 'pending',
    progress: 0,
    icon: Download
  },
  {
    id: 'extract-files',
    name: 'Extracting Files',
    description: 'Extracting template files and dependencies',
    status: 'pending',
    progress: 0,
    icon: Upload
  },
  {
    id: 'install-dependencies',
    name: 'Installing Dependencies',
    description: 'Installing required packages and dependencies',
    status: 'pending',
    progress: 0,
    icon: Loader
  }
];

export const createDeploymentSteps = (integrations: string[]): DeploymentStep[] => {
  const steps: DeploymentStep[] = [
    {
      id: 'prepare-build',
      name: 'Preparing Build',
      description: 'Optimizing code and assets for production',
      status: 'pending',
      progress: 0,
      icon: Upload
    }
  ];

  if (integrations.includes('github')) {
    steps.push({
      id: 'github-deploy',
      name: 'GitHub Repository',
      description: 'Creating repository and pushing code',
      status: 'pending',
      progress: 0,
      icon: Github
    });
  }

  if (integrations.includes('supabase')) {
    steps.push({
      id: 'supabase-setup',
      name: 'Database Setup',
      description: 'Provisioning Supabase database and tables',
      status: 'pending',
      progress: 0,
      icon: Database
    });
  }

  if (integrations.includes('vercel')) {
    steps.push({
      id: 'vercel-deploy',
      name: 'Vercel Deployment',
      description: 'Deploying to Vercel and configuring domains',
      status: 'pending',
      progress: 0,
      icon: Cloud
    });
  }

  return steps;
};