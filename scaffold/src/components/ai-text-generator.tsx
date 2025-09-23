import React, { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { generateAIText, isAIConfigured, getAPIKeyInstructions } from '@/lib/ai';
import { Alert, AlertDescription } from './ui/alert';

interface AITextGeneratorProps {
  placeholder?: string;
  title?: string;
  description?: string;
  maxTokens?: number;
  temperature?: number;
}

export function AITextGenerator({
  placeholder = "Enter your prompt here...",
  title = "AI Text Generator",
  description = "Generate text using AI powered by Gemini 2.5 Flash",
  maxTokens = 1000,
  temperature = 0.7
}: AITextGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      const response = await generateAIText(prompt, { maxTokens, temperature });
      
      if (response.success) {
        setResult(response.text);
      } else {
        setResult(`Error: ${response.error}`);
      }
    } catch (error) {
      setResult(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAIConfigured()) {
    const instructions = getAPIKeyInstructions();
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Sparkles className="w-4 h-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>AI not configured.</strong> To use AI features, you need a {instructions.provider} API key:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  {instructions.instructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder={placeholder}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px]"
          />
          <div className="flex gap-2">
            <Button 
              onClick={handleGenerate}
              disabled={!prompt.trim() || isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isLoading ? 'Generating...' : 'Generate'}
            </Button>
            <Badge variant="secondary">
              Gemini 2.5 Flash
            </Badge>
          </div>
        </div>

        {result && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Generated Text:</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="whitespace-pre-wrap">{result}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}