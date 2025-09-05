import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles, Layers, Star } from "lucide-react";
import { templatesData, DEFAULT_TEMPLATE_ID } from "@/templates";
export function TemplateSelector({ selectedTemplateId = DEFAULT_TEMPLATE_ID, onTemplateSelect, children }) {
    const [open, setOpen] = useState(false);
    const [currentSelection, setCurrentSelection] = useState(selectedTemplateId);
    const selectedTemplate = templatesData.find(t => t.id === currentSelection);
    const handleSelect = () => {
        onTemplateSelect(currentSelection);
        setOpen(false);
    };
    const handleTemplateClick = (template) => {
        setCurrentSelection(template.id);
    };
    return (_jsxs(Dialog, { open: open, onOpenChange: setOpen, children: [_jsx(DialogTrigger, { asChild: true, children: children || (_jsxs(Button, { variant: "outline", className: "flex items-center gap-2", children: [_jsx(Layers, { className: "w-4 h-4" }), "Template: ", selectedTemplate?.title || "Select Template"] })) }), _jsxs(DialogContent, { className: "max-w-4xl max-h-[80vh] overflow-hidden flex flex-col", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2 bg-primary/10 rounded-lg", children: _jsx(Sparkles, { className: "w-6 h-6 text-primary" }) }), "Choose Your Template"] }), _jsx(DialogDescription, { children: "Select a template to bootstrap your application with pre-configured tools, dependencies, and project structure." })] }), _jsxs("div", { className: "flex-1 overflow-y-auto py-4", children: [_jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/30 rounded-lg", children: templatesData.slice(0, 4).map((template) => (_jsxs("div", { className: `
                  flex flex-col items-center gap-2 p-3 rounded-lg cursor-pointer transition-all
                  ${currentSelection === template.id
                                        ? "bg-primary text-primary-foreground shadow-md"
                                        : "hover:bg-muted"}
                `, onClick: () => handleTemplateClick(template), children: [_jsx("div", { className: "text-2xl", children: template.icon }), _jsx("div", { className: "text-sm font-medium text-center", children: template.title }), template.id === DEFAULT_TEMPLATE_ID && (_jsx(Badge, { variant: "secondary", className: "text-xs", children: "Default" }))] }, template.id))) }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: templatesData.map((template) => (_jsxs(Card, { className: `
                  cursor-pointer transition-all border-2
                  ${currentSelection === template.id
                                        ? "border-primary ring-2 ring-primary/20"
                                        : "border-border hover:border-primary/50"}
                `, onClick: () => handleTemplateClick(template), children: [_jsx(CardHeader, { className: "pb-3", children: _jsx("div", { className: "flex items-start justify-between", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "text-2xl", children: template.icon }), _jsxs("div", { children: [_jsxs(CardTitle, { className: "text-lg flex items-center gap-2", children: [template.title, currentSelection === template.id && (_jsx(Check, { className: "w-4 h-4 text-primary" }))] }), _jsxs("div", { className: "flex items-center gap-2 mt-1", children: [template.isOfficial && (_jsxs(Badge, { variant: "default", className: "text-xs", children: [_jsx(Star, { className: "w-3 h-3 mr-1" }), "Official"] })), template.id === DEFAULT_TEMPLATE_ID && (_jsx(Badge, { variant: "secondary", className: "text-xs", children: "Default" }))] })] })] }) }) }), _jsxs(CardContent, { className: "pt-0", children: [_jsx(CardDescription, { className: "text-sm leading-relaxed", children: template.description }), template.githubUrl && (_jsxs("div", { className: "mt-3 text-xs text-muted-foreground", children: [_jsx("span", { className: "font-medium", children: "Source:" }), " ", template.githubUrl] }))] })] }, template.id))) })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setOpen(false), children: "Cancel" }), _jsxs(Button, { onClick: handleSelect, className: "flex items-center gap-2", children: [_jsx(Sparkles, { className: "w-4 h-4" }), "Create with ", selectedTemplate?.title] })] })] })] }));
}
