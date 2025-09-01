import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles, Layers, Star } from "lucide-react";
import { templatesData, type Template, DEFAULT_TEMPLATE_ID } from "@/templates";

interface TemplateSelectorProps {
  selectedTemplateId?: string;
  onTemplateSelect: (templateId: string) => void;
  children?: React.ReactNode;
}

export function TemplateSelector({ selectedTemplateId = DEFAULT_TEMPLATE_ID, onTemplateSelect, children }: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [currentSelection, setCurrentSelection] = useState(selectedTemplateId);

  const selectedTemplate = templatesData.find(t => t.id === currentSelection);

  const handleSelect = () => {
    onTemplateSelect(currentSelection);
    setOpen(false);
  };

  const handleTemplateClick = (template: Template) => {
    setCurrentSelection(template.id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Template: {selectedTemplate?.title || "Select Template"}
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            Choose Your Template
          </DialogTitle>
          <DialogDescription>
            Select a template to bootstrap your application with pre-configured tools, dependencies, and project structure.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {/* Icon-based Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
            {templatesData.slice(0, 4).map((template) => (
              <div
                key={template.id}
                className={`
                  flex flex-col items-center gap-2 p-3 rounded-lg cursor-pointer transition-all
                  ${currentSelection === template.id 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "hover:bg-muted"
                  }
                `}
                onClick={() => handleTemplateClick(template)}
              >
                <div className="text-2xl">{template.icon}</div>
                <div className="text-sm font-medium text-center">{template.title}</div>
                {template.id === DEFAULT_TEMPLATE_ID && (
                  <Badge variant="secondary" className="text-xs">
                    Default
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {/* Detailed Template Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templatesData.map((template) => (
              <Card
                key={template.id}
                className={`
                  cursor-pointer transition-all border-2
                  ${currentSelection === template.id 
                    ? "border-primary ring-2 ring-primary/20" 
                    : "border-border hover:border-primary/50"
                  }
                `}
                onClick={() => handleTemplateClick(template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{template.icon}</div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {template.title}
                          {currentSelection === template.id && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {template.isOfficial && (
                            <Badge variant="default" className="text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              Official
                            </Badge>
                          )}
                          {template.id === DEFAULT_TEMPLATE_ID && (
                            <Badge variant="secondary" className="text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <CardDescription className="text-sm leading-relaxed">
                    {template.description}
                  </CardDescription>
                  
                  {template.githubUrl && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      <span className="font-medium">Source:</span> {template.githubUrl}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSelect} className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Create with {selectedTemplate?.title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}