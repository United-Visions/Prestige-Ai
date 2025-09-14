import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { PrestigeBlockRenderer } from './PrestigeBlockRenderer';

/**
 * Demo component to showcase the Prestige AI block system
 * Simulates streaming AI responses with animated blocks
 */
export const PrestigeBlockDemo: React.FC = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [content, setContent] = useState('');
  const [demoStep, setDemoStep] = useState(0);

  // Sample streaming responses to demonstrate different blocks
  const demoResponses = [
    // Step 1: Just thinking
    '<think>\nAnalyzing your request to create a new React component. Let me plan out the structure and implementation...\n</think>',

    // Step 2: Add planning content
    '<think>\nAnalyzing your request to create a new React component. Let me plan out the structure and implementation...\n\nI\'ll create:\n1. A main Button component with TypeScript\n2. Add styling with Tailwind CSS\n3. Include proper props and event handling\n</think>\n\nI\'ll help you create a new Button component for your React application.',

    // Step 3: Add file writing
    '<think>\nAnalyzing your request to create a new React component. Let me plan out the structure and implementation...\n\nI\'ll create:\n1. A main Button component with TypeScript\n2. Add styling with Tailwind CSS\n3. Include proper props and event handling\n</think>\n\nI\'ll help you create a new Button component for your React application.\n\n<prestige-write path="src/components/Button.tsx" description="Creating a reusable Button component">\nimport React from \'react\';\nimport { cn } from \'@/lib/utils\';\n\ninterface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {\n  variant?: \'primary\' | \'secondary\' | \'outline\';\n  size?: \'sm\' | \'md\' | \'lg\';\n  children: React.ReactNode;\n}\n\nexport const Button: React.FC<ButtonProps> = ({\n  variant = \'primary\',\n  size = \'md\',\n  className,\n  children,\n  ...props\n}) => {\n  return (\n    <button\n      className={cn(\n        \'rounded-lg font-medium transition-colors focus:outline-none focus:ring-2\',\n        {\n          \'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-300\': variant === \'primary\',\n          \'bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-300\': variant === \'secondary\',\n          \'border border-gray-300 hover:bg-gray-50 text-gray-700 focus:ring-gray-300\': variant === \'outline\',\n          \'px-3 py-1.5 text-sm\': size === \'sm\',\n          \'px-4 py-2 text-base\': size === \'md\',\n          \'px-6 py-3 text-lg\': size === \'lg\',\n        },\n        className\n      )}\n      {...props}\n    >\n      {children}\n    </button>\n  );\n};\n</prestige-write>',

    // Step 4: Add dependencies
    '<think>\nAnalyzing your request to create a new React component. Let me plan out the structure and implementation...\n\nI\'ll create:\n1. A main Button component with TypeScript\n2. Add styling with Tailwind CSS\n3. Include proper props and event handling\n</think>\n\nI\'ll help you create a new Button component for your React application.\n\n<prestige-write path="src/components/Button.tsx" description="Creating a reusable Button component">\nimport React from \'react\';\nimport { cn } from \'@/lib/utils\';\n\ninterface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {\n  variant?: \'primary\' | \'secondary\' | \'outline\';\n  size?: \'sm\' | \'md\' | \'lg\';\n  children: React.ReactNode;\n}\n\nexport const Button: React.FC<ButtonProps> = ({\n  variant = \'primary\',\n  size = \'md\',\n  className,\n  children,\n  ...props\n}) => {\n  return (\n    <button\n      className={cn(\n        \'rounded-lg font-medium transition-colors focus:outline-none focus:ring-2\',\n        {\n          \'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-300\': variant === \'primary\',\n          \'bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-300\': variant === \'secondary\',\n          \'border border-gray-300 hover:bg-gray-50 text-gray-700 focus:ring-gray-300\': variant === \'outline\',\n          \'px-3 py-1.5 text-sm\': size === \'sm\',\n          \'px-4 py-2 text-base\': size === \'md\',\n          \'px-6 py-3 text-lg\': size === \'lg\',\n        },\n        className\n      )}\n      {...props}\n    >\n      {children}\n    </button>\n  );\n};\n</prestige-write>\n\n<prestige-add-dependency packages="clsx tailwind-merge"></prestige-add-dependency>',

    // Step 5: Add command and integration
    '<think>\nAnalyzing your request to create a new React component. Let me plan out the structure and implementation...\n\nI\'ll create:\n1. A main Button component with TypeScript\n2. Add styling with Tailwind CSS\n3. Include proper props and event handling\n</think>\n\nI\'ll help you create a new Button component for your React application.\n\n<prestige-write path="src/components/Button.tsx" description="Creating a reusable Button component">\nimport React from \'react\';\nimport { cn } from \'@/lib/utils\';\n\ninterface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {\n  variant?: \'primary\' | \'secondary\' | \'outline\';\n  size?: \'sm\' | \'md\' | \'lg\';\n  children: React.ReactNode;\n}\n\nexport const Button: React.FC<ButtonProps> = ({\n  variant = \'primary\',\n  size = \'md\',\n  className,\n  children,\n  ...props\n}) => {\n  return (\n    <button\n      className={cn(\n        \'rounded-lg font-medium transition-colors focus:outline-none focus:ring-2\',\n        {\n          \'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-300\': variant === \'primary\',\n          \'bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-300\': variant === \'secondary\',\n          \'border border-gray-300 hover:bg-gray-50 text-gray-700 focus:ring-gray-300\': variant === \'outline\',\n          \'px-3 py-1.5 text-sm\': size === \'sm\',\n          \'px-4 py-2 text-base\': size === \'md\',\n          \'px-6 py-3 text-lg\': size === \'lg\',\n        },\n        className\n      )}\n      {...props}\n    >\n      {children}\n    </button>\n  );\n};\n</prestige-write>\n\n<prestige-add-dependency packages="clsx tailwind-merge"></prestige-add-dependency>\n\n<prestige-command type="rebuild"></prestige-command>\n\n<prestige-add-integration provider="github">\nI\'ve set up the component with modern React patterns. The GitHub integration will help with version control and collaboration.\n</prestige-add-integration>\n\n<prestige-chat-summary>Created Button component with TypeScript and Tailwind CSS</prestige-chat-summary>'
  ];

  const startDemo = () => {
    setIsStreaming(true);
    setContent('');
    setDemoStep(0);
  };

  const resetDemo = () => {
    setIsStreaming(false);
    setContent('');
    setDemoStep(0);
  };

  const toggleStreaming = () => {
    setIsStreaming(!isStreaming);
  };

  // Simulate streaming
  useEffect(() => {
    if (!isStreaming || demoStep >= demoResponses.length) {
      if (demoStep >= demoResponses.length) {
        setIsStreaming(false);
      }
      return;
    }

    const timer = setTimeout(() => {
      setContent(demoResponses[demoStep]);
      setDemoStep(prev => prev + 1);
    }, 2000); // 2 second delay between steps

    return () => clearTimeout(timer);
  }, [isStreaming, demoStep]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Prestige AI Block System Demo</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Step {demoStep} of {demoResponses.length}
              </Badge>
              {isStreaming && (
                <Badge variant="outline" className="text-xs bg-green-50 border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
                  Streaming
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-6">
            <Button onClick={startDemo} disabled={isStreaming} className="flex items-center gap-2">
              <Play size={16} />
              Start Demo
            </Button>
            <Button onClick={toggleStreaming} variant="outline" className="flex items-center gap-2">
              {isStreaming ? <Pause size={16} /> : <Play size={16} />}
              {isStreaming ? 'Pause' : 'Resume'}
            </Button>
            <Button onClick={resetDemo} variant="outline" className="flex items-center gap-2">
              <RotateCcw size={16} />
              Reset
            </Button>
          </div>

          <div className="border rounded-lg p-4 min-h-96 bg-gray-50 dark:bg-gray-900">
            {content ? (
              <PrestigeBlockRenderer content={content} isStreaming={isStreaming} />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <div className="text-lg font-medium mb-2">Prestige AI Block Demo</div>
                  <div className="text-sm">Click \"Start Demo\" to see animated blocks in action</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Block Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="font-medium">Thinking Block</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="font-medium">File Write Block</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="font-medium">Add Dependencies Block</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="font-medium">Command Block</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                <span className="font-medium">Integration Block</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span className="font-medium">Regular Markdown</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrestigeBlockDemo;