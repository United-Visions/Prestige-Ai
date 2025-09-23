import { MadeWithPrestigeAI } from "@/components/made-with-prestige";
import { AITextGenerator } from "@/components/ai-text-generator";
import { AIChat } from "@/components/ai-chat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Database, MessageSquare, Zap } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Welcome to Your AI-Powered App
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            This scaffold comes pre-configured with MongoDB, AI SDK, and powerful components
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Gemini 2.5 Flash
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              MongoDB Ready
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              shadcn/ui
            </Badge>
          </div>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                AI Integration
              </CardTitle>
              <CardDescription>
                Pre-configured AI SDK with Gemini 2.5 Flash for text generation, chat, and more
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                MongoDB Setup
              </CardTitle>
              <CardDescription>
                Automatic in-memory MongoDB with schemas, models, and connection utilities
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Ready Components
              </CardTitle>
              <CardDescription>
                Pre-built AI and database components ready to use in your application
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Demo Tabs */}
        <Tabs defaultValue="ai-text" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ai-text" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Text
            </TabsTrigger>
            <TabsTrigger value="ai-chat" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              AI Chat
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Database
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai-text">
            <AITextGenerator
              title="AI Text Generator Demo"
              description="Generate text using Gemini 2.5 Flash - try prompts like 'Write a blog post about...'"
              placeholder="Enter your prompt here... (e.g., 'Write a product description for a smart water bottle')"
            />
          </TabsContent>

          <TabsContent value="ai-chat">
            <AIChat
              title="AI Chat Assistant Demo"
              description="Have a conversation with AI powered by Gemini 2.5 Flash"
              systemPrompt="You are a helpful AI assistant for a modern web application. You can help with development questions, content creation, and general assistance."
              placeholder="Ask me anything..."
            />
          </TabsContent>

          <TabsContent value="database">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  MongoDB Demo (Electron only)
                </CardTitle>
                <CardDescription>
                  The interactive MongoDB demo uses Node/Electron APIs (mongoose, mongodb-memory-server) and is disabled in the browser.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  To try the database demo, run this scaffold inside the Prestige Electron environment or wire it to a backend API. The rest of the scaffold (AI, UI components) runs fully in the browser.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Getting Started */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>🚀 Getting Started</CardTitle>
            <CardDescription>
              Your app is ready to go! Here's what you can do next:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">For AI Features:</h4>
                <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Get a Gemini API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a></li>
                  <li>Add <code>VITE_GEMINI_API_KEY=your_key</code> to your .env file</li>
                  <li>Use the AI components or create your own with the utilities in <code>src/lib/ai.ts</code></li>
                </ol>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">For Database:</h4>
                <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
                  <li>MongoDB is automatically configured with in-memory server</li>
                  <li>Schemas are ready in <code>src/lib/schemas.ts</code></li>
                  <li>Connection utilities available in <code>src/lib/db.ts</code></li>
                  <li>For production, set <code>MONGODB_URI</code> environment variable</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        <MadeWithPrestigeAI />
      </div>
    </div>
  );
};

export default Index;
