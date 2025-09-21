import React, { useState, useEffect } from 'react';
import { autoModeService } from '@/services/autoModeService';
import useAppStore from '@/stores/appStore';
import { CheckCircle2, Circle, ListTodo, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEnhancedStreaming } from '@/services/enhancedStreamingService';
import { constructSystemPromptAsync, readAiRules } from '@/prompts/system_prompt';
import type { DevelopmentPlan } from '@/types/autoMode';

export const TodoSideView: React.FC = () => {
  const { currentApp, currentConversation, selectedModel } = useAppStore();
  const [plan, setPlan] = useState<DevelopmentPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isContinuing, setIsContinuing] = useState(false);
  const { startEnhancedStream } = useEnhancedStreaming();

  useEffect(() => {
    if (!currentApp || !currentConversation) return;
    
    const loadPlans = async () => {
      setIsLoading(true);
      try {
        const plans = await autoModeService.getPlans(currentConversation.id);
        setPlan(plans[0] || null);
      } catch (e) {
        console.warn('Failed to load plans:', e);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPlans();
  }, [currentApp, currentConversation]);

  const handleContinuePlan = async () => {
    if (!plan || !currentConversation || !selectedModel || isContinuing) return;
    
    setIsContinuing(true);
    try {
      const systemPrompt = currentApp ? 
        await constructSystemPromptAsync({ aiRules: await readAiRules(currentApp.path) }) :
        'You are an AI assistant.';
      
      await startEnhancedStream(`Continue working on plan: ${plan.title}`, {
        selectedModel,
        systemPrompt,
        continuation: { conversationId: currentConversation.id, planId: plan.id },
        onContinuationDone: () => {
          setIsContinuing(false);
          // Refresh plan to show updated todos
          autoModeService.getPlans(currentConversation.id).then(plans => {
            setPlan(plans[0] || null);
          });
        },
        onError: () => setIsContinuing(false)
      });
    } catch (e) {
      console.error('Failed to continue plan:', e);
      setIsContinuing(false);
    }
  };

  if (!currentApp || !currentConversation) return null;

  if (isLoading) {
    return (
      <div className="w-72 border-l bg-card p-4 hidden md:block">
        <div className="flex items-center gap-2 mb-3">
          <ListTodo className="w-4 h-4" />
          <h3 className="text-sm font-semibold">Development ToDos</h3>
        </div>
        <p className="text-xs text-muted-foreground">Loading plan...</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="w-72 border-l bg-card p-4 hidden md:block">
        <div className="flex items-center gap-2 mb-3">
          <ListTodo className="w-4 h-4" />
          <h3 className="text-sm font-semibold">Development ToDos</h3>
        </div>
        <p className="text-xs text-muted-foreground">No plan yet. The agent will create one when it starts building.</p>
      </div>
    );
  }

  const todos = plan.phases.flatMap(p => p.todos.map(t => ({...t, phase: p.title})));
  const remaining = todos.filter(t => t.status !== 'completed');

  return (
    <div className="w-72 border-l bg-card p-4 hidden md:block">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4" />
          <h3 className="text-sm font-semibold">ToDos ({remaining.length})</h3>
        </div>
        {remaining.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleContinuePlan}
            disabled={isContinuing}
            className="h-7 px-2 text-xs"
          >
            <Play className="w-3 h-3 mr-1" />
            {isContinuing ? 'Working...' : 'Continue'}
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {todos.slice(0, 10).map(todo => (
          <div key={todo.id} className="flex items-start gap-2 text-sm">
            {todo.status === 'completed' ? (
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{todo.title}</div>
              <div className="text-xs text-muted-foreground truncate">{todo.phase}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TodoSideView;