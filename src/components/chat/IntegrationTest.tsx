// Test component to verify integration detection works properly
// This can be used to test the integration system without actual apps

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PrestigeMarkdownRenderer } from './PrestigeMarkdownRenderer';

export function IntegrationTest() {
  const [testContent, setTestContent] = useState('');

  const testCases = {
    'No Integrations': `
I'd like to add user authentication to my app so users can sign up and log in.

<prestige-add-integration provider="supabase"></prestige-add-integration>

Let me know when you're ready to proceed!
`,
    'GitHub Integration': `
I want to deploy my app to GitHub Pages.

<prestige-add-integration provider="github"></prestige-add-integration>

Once you set up GitHub, we can configure automatic deployments.
`,
    'Mixed Content': `
<think>
The user wants to build a full-stack application with authentication and deployment. I should:
• Check what integrations they have available
• Guide them through the setup process  
• **Focus on user experience** - make setup as smooth as possible
</think>

I'll help you build a complete application! First, let's set up the necessary integrations:

For authentication and database:
<prestige-add-integration provider="supabase">This will provide user authentication, database storage, and real-time features.</prestige-add-integration>

For deployment:
<prestige-add-integration provider="vercel">This will handle automatic deployments and hosting.</prestige-add-integration>

After setup, we'll need to rebuild the project:
<prestige-command type="rebuild"></prestige-command>

<prestige-chat-summary>Setting up integrations</prestige-chat-summary>
`,
    'Commands Only': `
I made some configuration changes. Let's restart the development server to apply them.

<prestige-command type="restart"></prestige-command>

If that doesn't work, we might need to do a full rebuild:

<prestige-command type="rebuild"></prestige-command>
`
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integration System Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {Object.entries(testCases).map(([name, content]) => (
                <Button
                  key={name}
                  variant="outline"
                  size="sm"
                  onClick={() => setTestContent(content)}
                >
                  {name}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTestContent('')}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {testContent && (
        <Card>
          <CardHeader>
            <CardTitle>Rendered Output</CardTitle>
          </CardHeader>
          <CardContent>
            <PrestigeMarkdownRenderer 
              content={testContent} 
              isStreaming={false}
            />
          </CardContent>
        </Card>
      )}

      {testContent && (
        <Card>
          <CardHeader>
            <CardTitle>Raw Content</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
              {testContent}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}