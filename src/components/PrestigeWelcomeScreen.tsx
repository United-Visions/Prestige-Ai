import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TemplateSelector } from '@/components/TemplateSelector';
import { DEFAULT_TEMPLATE_ID, getTemplateById } from '@/templates';
import { ToolsMenuDialog } from '@/components/dialogs/ToolsMenuDialog';
import { tokenStorageService } from '@/services/tokenStorageService';
import { 
  Crown,
  Sparkles, 
  Code, 
  FileText, 
  Zap, 
  Rocket,
  Gem,
  Star,
  ArrowRight,
  ChevronDown,
  Github,
  Database,
  Globe,
  CheckCircle,
  Settings,
  Users
} from 'lucide-react';

interface PrestigeWelcomeScreenProps {
  selectedTemplateId: string;
  onTemplateSelect: (templateId: string) => void;
  onQuickPrompt: (prompt: string) => void;
  onCreateWithTemplate: () => void;
}

export function PrestigeWelcomeScreen({ 
  selectedTemplateId, 
  onTemplateSelect, 
  onQuickPrompt,
  onCreateWithTemplate
}: PrestigeWelcomeScreenProps) {
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    github: false,
    supabase: false,
    vercel: false
  });

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const status = await tokenStorageService.getConnectionStatus();
      setConnectionStatus(status);
    } catch (error) {
      console.error('Failed to check connection status:', error);
    }
  };
  
  const quickPrompts = [
    { 
      icon: <Code className="w-5 h-5" />, 
      title: 'React Application', 
      description: 'Modern React app with TypeScript',
      prompt: 'Create a modern React todo application with TypeScript, Tailwind CSS, and local storage',
      gradient: 'from-blue-500 to-cyan-500'
    },
    { 
      icon: <FileText className="w-5 h-5" />, 
      title: 'Landing Page', 
      description: 'Beautiful responsive website',
      prompt: 'Create a modern landing page with hero section, features, testimonials, and contact form',
      gradient: 'from-purple-500 to-pink-500'
    },
    { 
      icon: <Zap className="w-5 h-5" />, 
      title: 'Node.js API', 
      description: 'RESTful backend service',
      prompt: 'Create a RESTful API using Node.js, Express, and TypeScript with user authentication',
      gradient: 'from-green-500 to-emerald-500'
    },
    { 
      icon: <Rocket className="w-5 h-5" />, 
      title: 'Full Stack App', 
      description: 'Complete web application',
      prompt: 'Create a full-stack application with React frontend, Node.js backend, and database integration',
      gradient: 'from-orange-500 to-red-500'
    },
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-8 custom-scrollbar overflow-y-auto">
      <div className="max-w-4xl w-full space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          {/* Animated Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-2xl animate-float">
                <Crown className="w-12 h-12 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-accent flex items-center justify-center shadow-lg">
                <Gem className="w-4 h-4 text-accent-foreground" />
              </div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-success flex items-center justify-center">
                <Star className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
          
          {/* Welcome Text */}
          <div className="space-y-4">
            <h1 className="text-5xl font-bold prestige-gradient-text flex items-center justify-center gap-3">
              Welcome to Prestige AI
              <Sparkles className="w-8 h-8 text-primary animate-bounce-subtle" />
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Your elite AI development companion. Create sophisticated applications, 
              write elegant code, and build extraordinary projects with the power of artificial intelligence.
            </p>
          </div>
          
          {/* Feature Badges */}
          <div className="flex justify-center gap-3 flex-wrap">
            <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
              ✨ AI-Powered
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
              🚀 Instant Setup
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
              💎 Premium Quality
            </Badge>
          </div>
        </div>

        {/* Account Connections Section */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Connect Your Accounts</h2>
            <p className="text-muted-foreground">
              Connect your development accounts for seamless workflow automation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {/* GitHub Connection */}
            <Card className={`cursor-pointer transition-all duration-300 ${
              connectionStatus.github 
                ? 'border-green-300 bg-green-50 hover:bg-green-100' 
                : 'hover:shadow-lg border-gray-300 bg-gray-50 hover:bg-gray-100'
            }`}
            onClick={() => setToolsMenuOpen(true)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    connectionStatus.github 
                      ? 'bg-green-100' 
                      : 'bg-gray-200'
                  }`}>
                    <Github className={`w-6 h-6 ${
                      connectionStatus.github ? 'text-green-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">GitHub</h3>
                    <p className="text-xs text-muted-foreground">Version Control</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {connectionStatus.github ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">Connected</span>
                      </>
                    ) : (
                      <>
                        <Settings className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-500">Connect</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Supabase Connection */}
            <Card className={`cursor-pointer transition-all duration-300 ${
              connectionStatus.supabase 
                ? 'border-green-300 bg-green-50 hover:bg-green-100' 
                : 'hover:shadow-lg border-gray-300 bg-gray-50 hover:bg-gray-100'
            }`}
            onClick={() => setToolsMenuOpen(true)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    connectionStatus.supabase 
                      ? 'bg-green-100' 
                      : 'bg-gray-200'
                  }`}>
                    <Database className={`w-6 h-6 ${
                      connectionStatus.supabase ? 'text-green-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Supabase</h3>
                    <p className="text-xs text-muted-foreground">Backend Services</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {connectionStatus.supabase ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">Connected</span>
                      </>
                    ) : (
                      <>
                        <Settings className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-500">Connect</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vercel Connection */}
            <Card className={`cursor-pointer transition-all duration-300 ${
              connectionStatus.vercel 
                ? 'border-green-300 bg-green-50 hover:bg-green-100' 
                : 'hover:shadow-lg border-gray-300 bg-gray-50 hover:bg-gray-100'
            }`}
            onClick={() => setToolsMenuOpen(true)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    connectionStatus.vercel 
                      ? 'bg-green-100' 
                      : 'bg-gray-200'
                  }`}>
                    <Globe className={`w-6 h-6 ${
                      connectionStatus.vercel ? 'text-green-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Vercel</h3>
                    <p className="text-xs text-muted-foreground">Deployment</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {connectionStatus.vercel ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">Connected</span>
                      </>
                    ) : (
                      <>
                        <Settings className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-500">Connect</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Connection Status Alert */}
          {connectionStatus.github || connectionStatus.supabase || connectionStatus.vercel ? (
            <Alert className="border-green-300 bg-green-50 max-w-2xl mx-auto">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {[connectionStatus.github, connectionStatus.supabase, connectionStatus.vercel].filter(Boolean).length} account(s) connected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setToolsMenuOpen(true)}
                    className="border-green-300 text-green-700 hover:bg-green-100"
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    Manage
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-blue-200 bg-blue-50 max-w-2xl mx-auto">
              <Users className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="flex items-center justify-between">
                  <span>Connect your development accounts to unlock full workflow automation</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setToolsMenuOpen(true)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    Setup
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Template Selection */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Choose Your Foundation</h2>
            <p className="text-muted-foreground">
              Select a premium template to get started or browse our complete collection
            </p>
          </div>
          
          <div className="flex justify-center">
            <TemplateSelector
              selectedTemplateId={selectedTemplateId}
              onTemplateSelect={onTemplateSelect}
            >
              <Card className="w-96 cursor-pointer border-2 border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-glow group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl group-hover:scale-110 transition-transform duration-200">
                      {getTemplateById(selectedTemplateId)?.icon || '⚡'}
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-lg">
                        {getTemplateById(selectedTemplateId)?.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getTemplateById(selectedTemplateId)?.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-gradient-primary text-white border-0">
                        Recommended
                      </Badge>
                      <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TemplateSelector>
          </div>
          
          <p className="text-center text-xs text-muted-foreground">
            Click to explore all available templates and frameworks
          </p>
        </div>

        {/* Create Button */}
        <div className="flex justify-center">
          <Button 
            size="lg" 
            className="px-12 py-4 text-lg font-semibold bg-gradient-primary hover:opacity-90 text-white shadow-xl hover:shadow-2xl transition-all duration-300 group"
            onClick={onCreateWithTemplate}
          >
            <Crown className="w-5 h-5 mr-3 group-hover:animate-bounce-subtle" />
            Create Premium App
            <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        {/* Quick Start Options */}
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">Quick Start Ideas</h3>
            <p className="text-muted-foreground text-sm">
              Or jump right in with these curated project suggestions
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {quickPrompts.map((prompt, index) => (
              <Card 
                key={index}
                className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-card to-card/80 group"
                onClick={() => onQuickPrompt(prompt.prompt)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${prompt.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                      <div className="text-white">
                        {prompt.icon}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">
                        {prompt.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {prompt.description}
                      </p>
                      <div className="flex items-center text-xs text-primary font-medium">
                        <span>Get Started</span>
                        <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center space-y-4 py-8">
          <div className="flex justify-center items-center gap-2 text-sm text-muted-foreground">
            <Gem className="w-4 h-4" />
            <span>Powered by advanced AI technology</span>
          </div>
        </div>
      </div>

      {/* Tools Menu Dialog */}
      <ToolsMenuDialog
        isOpen={toolsMenuOpen}
        onClose={() => setToolsMenuOpen(false)}
        currentApp={null}
      />
    </div>
  );
}