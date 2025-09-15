import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Crown,
  Sparkles,
  Brain,
  Zap,
  StopCircle,
  Loader2,
  Cpu
} from 'lucide-react';

interface AIThinkingIndicatorProps {
  onStop: () => void;
  stage?: 'thinking' | 'processing' | 'generating';
}

export function AIThinkingIndicator({ onStop, stage = 'thinking' }: AIThinkingIndicatorProps) {
  const getStageInfo = () => {
    switch (stage) {
      case 'thinking':
        return {
          icon: Brain,
          text: 'Analyzing your request...',
          subtext: 'Understanding context and requirements',
          color: 'from-blue-500 to-purple-500'
        };
      case 'processing':
        return {
          icon: Cpu,
          text: 'Processing solution...',
          subtext: 'Generating optimal approach',
          color: 'from-purple-500 to-pink-500'
        };
      case 'generating':
        return {
          icon: Zap,
          text: 'Creating response...',
          subtext: 'Crafting detailed solution',
          color: 'from-pink-500 to-red-500'
        };
    }
  };

  const stageInfo = getStageInfo();
  const StageIcon = stageInfo.icon;

  return (
    <div className="flex gap-4 justify-start animate-fade-in mb-6">
      {/* AI Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md border-2 border-purple-300 relative animate-pulse-slow">
        <Crown className="w-5 h-5 text-white" />
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center animate-spin">
          <Sparkles className="w-2 h-2 text-white" />
        </div>

        {/* Thinking Animation Ring */}
        <div className="absolute inset-0 rounded-full border-2 border-purple-300 animate-ping opacity-75"></div>
      </div>

      <div className="max-w-4xl flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Prestige AI
          </span>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-purple-500 animate-pulse"></div>
            <div className="w-1 h-1 rounded-full bg-pink-500 animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>

        <Card className="border-purple-200 bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-purple-950 shadow-lg">
          <CardContent className="p-6">
            {/* Header with Stop Button */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${stageInfo.color} flex items-center justify-center animate-pulse`}>
                  <StageIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {stageInfo.text}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stageInfo.subtext}
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                variant="destructive"
                onClick={onStop}
                className="h-8 px-3 text-xs hover:scale-105 transition-transform"
              >
                <StopCircle className="w-3 h-3 mr-1" />
                Stop
              </Button>
            </div>

            {/* Thinking Animation */}
            <div className="space-y-4">
              {/* Progress Bars */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>AI Processing</span>
                  <span>∞</span>
                </div>
                <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${stageInfo.color} animate-progress`}></div>
                </div>
              </div>

              {/* Thinking Dots */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Engaging neural pathways</span>
                <div className="flex items-center gap-1 ml-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>

              {/* Random Thinking Messages */}
              <div className="text-xs text-muted-foreground animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-ping"></div>
                  <span>Analyzing codebase patterns...</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}