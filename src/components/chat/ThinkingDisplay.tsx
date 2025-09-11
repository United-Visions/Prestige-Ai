import React from 'react';
import { Card } from '@/components/ui/card';
import { Brain, Lightbulb, Cog } from 'lucide-react';

interface ThinkingDisplayProps {
  content: string;
  isActive?: boolean;
}

export function ThinkingDisplay({ content, isActive = false }: ThinkingDisplayProps) {
  if (!content) return null;

  // Parse thinking content to extract structured phases
  const parseThinkingPhases = (text: string) => {
    const phases: { title: string; content: string; icon: React.ReactNode }[] = [];
    
    // Common thinking patterns from dyad
    const patterns = [
      { regex: /Initial Analysis[\s\S]*?(?=\n\n|\n[A-Z]|$)/, title: 'Initial Analysis', icon: <Brain className="h-4 w-4" /> },
      { regex: /Planning Phase[\s\S]*?(?=\n\n|\n[A-Z]|$)/, title: 'Planning Phase', icon: <Cog className="h-4 w-4" /> },
      { regex: /Implementation Strategy[\s\S]*?(?=\n\n|\n[A-Z]|$)/, title: 'Implementation Strategy', icon: <Lightbulb className="h-4 w-4" /> },
      { regex: /Component Design[\s\S]*?(?=\n\n|\n[A-Z]|$)/, title: 'Component Design', icon: <Cog className="h-4 w-4" /> },
      { regex: /Defining Application Scope[\s\S]*?(?=\n\n|\n[A-Z]|$)/, title: 'Defining Application Scope', icon: <Brain className="h-4 w-4" /> },
      { regex: /Outlining Project Structure[\s\S]*?(?=\n\n|\n[A-Z]|$)/, title: 'Outlining Project Structure', icon: <Cog className="h-4 w-4" /> },
    ];

    patterns.forEach(pattern => {
      const match = text.match(pattern.regex);
      if (match) {
        phases.push({
          title: pattern.title,
          content: match[0].trim(),
          icon: pattern.icon
        });
      }
    });

    // If no structured phases found, create a general thinking phase
    if (phases.length === 0 && text.trim()) {
      phases.push({
        title: 'Thinking',
        content: text.trim(),
        icon: <Brain className="h-4 w-4" />
      });
    }

    return phases;
  };

  const phases = parseThinkingPhases(content);

  return (
    <div className="space-y-3">
      {phases.map((phase, index) => (
        <Card 
          key={index} 
          className={`border-l-4 ${
            isActive 
              ? 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20' 
              : 'border-l-gray-300 bg-gray-50/50 dark:bg-gray-950/20'
          } transition-colors duration-300`}
        >
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {phase.icon}
              </div>
              <h4 className={`font-medium text-sm ${
                isActive 
                  ? 'text-blue-900 dark:text-blue-100' 
                  : 'text-gray-900 dark:text-gray-100'
              }`}>
                {phase.title}
                {isActive && (
                  <span className="ml-2 inline-flex items-center">
                    <div className="animate-pulse flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </span>
                )}
              </h4>
            </div>
            <p className={`text-sm leading-relaxed ${
              isActive 
                ? 'text-blue-800 dark:text-blue-200' 
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {phase.content}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}