# Prestige Codebase Context Examples

This document demonstrates how to use the new `<prestige-codebase-context>` block for intelligent context management.

## Context Block Types

### 1. Full Analysis (App Editing)
```xml
<prestige-codebase-context type="full-analysis">
Analyze the entire codebase to understand architecture, patterns, and conventions
</prestige-codebase-context>
```

**When to use:** Starting work on an existing app, need to understand the full project structure.

### 2. Template Scaffolding (App Creation)
```xml
<prestige-codebase-context type="template" template-id="react-vite">
Load template structure and patterns for new app creation
</prestige-codebase-context>
```

**When to use:** Creating a new app from a template, need template conventions.

### 3. Targeted Context (Focused Editing)
```xml
<prestige-codebase-context type="targeted"
  files="src/components/LoginForm.tsx,src/hooks/useAuth.ts"
  patterns="authentication,login,session">
Focus on authentication-related files and patterns
</prestige-codebase-context>
```

**When to use:** Making specific changes, need only relevant files in context.

### 4. Context Clearing (Memory Management)
```xml
<prestige-codebase-context type="clear-and-replace"
  keep="src/components/NewComponent.tsx,package.json">
Clear all context except the newly created files
</prestige-codebase-context>
```

**When to use:** After completing work, keep only essential files in memory.

## Workflow Examples

### App Creation Workflow
```xml
User: "Create a React todo app with authentication"

<!-- 1. Load template context -->
<prestige-codebase-context type="template" template-id="react-auth-template">
Analyze template structure for React apps with auth
</prestige-codebase-context>

<!-- 2. Create files based on template patterns -->
<prestige-write path="src/components/TodoApp.tsx" description="Main todo app component">
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
// ... follows template patterns
</prestige-write>

<!-- 3. Clear template context, keep created files -->
<prestige-codebase-context type="clear-and-replace"
  keep="src/components/TodoApp.tsx,src/hooks/useAuth.ts,package.json">
Clear template scaffolding, keep only project files
</prestige-codebase-context>

<prestige-chat-summary>Created todo app with authentication</prestige-chat-summary>
```

### App Editing Workflow
```xml
User: "Add a dark mode toggle to the settings page"

<!-- 1. Full codebase analysis -->
<prestige-codebase-context type="full-analysis">
Understand app architecture, existing theming, and component patterns
</prestige-codebase-context>

<!-- 2. Identify relevant files -->
<prestige-codebase-context type="targeted"
  files="src/components/Settings.tsx,src/contexts/ThemeContext.tsx,src/styles/theme.css"
  patterns="theme,dark-mode,settings">
Focus on theme-related files and settings components
</prestige-codebase-context>

<!-- 3. Make context-aware changes -->
<prestige-write path="src/components/Settings.tsx" description="Add dark mode toggle">
// Uses existing patterns from ThemeContext
const { theme, toggleTheme } = useTheme();
// ... implementation matches existing code style
</prestige-write>

<prestige-chat-summary>Added dark mode toggle to settings</prestige-chat-summary>
```

### Bug Fix Workflow
```xml
User: "Fix the login form validation error"

<!-- 1. Analyze full app for context -->
<prestige-codebase-context type="full-analysis">
Understand app structure and validation patterns
</prestige-codebase-context>

<!-- 2. Focus on validation-related files -->
<prestige-codebase-context type="targeted"
  files="src/components/LoginForm.tsx,src/utils/validation.ts,src/hooks/useForm.ts"
  patterns="validation,login,form-errors">
Analyze validation logic and form handling
</prestige-codebase-context>

<!-- 3. Fix using existing patterns -->
<prestige-write path="src/components/LoginForm.tsx" description="Fix validation error handling">
// Uses existing validation utilities and error patterns
const { validate } = useValidation(loginSchema);
// ... follows established error handling patterns
</prestige-write>

<!-- 4. Clean up context -->
<prestige-codebase-context type="clear-and-replace"
  keep="src/components/LoginForm.tsx,src/utils/validation.ts">
Keep only the modified files for reference
</prestige-codebase-context>

<prestige-chat-summary>Fixed login validation error</prestige-chat-summary>
```

## Query-Based Context
```xml
<prestige-codebase-context type="targeted" query="button components styling">
Find all files related to button components and their styling
</prestige-codebase-context>
```

This will search for files containing terms like "button", "components", "styling" and load relevant files.

## Pattern Matching
```xml
<prestige-codebase-context type="targeted"
  patterns="api,fetch,axios,http"
  files="src/services/api.ts">
Focus on API-related code and HTTP requests
</prestige-codebase-context>
```

This loads files matching API patterns plus the specified api.ts file.

## Benefits

1. **Template-Aware Creation**: New apps perfectly follow template conventions
2. **Context-Aware Editing**: Changes align with existing codebase patterns
3. **Memory Efficient**: Only relevant files in context, not entire codebase
4. **Intelligent Suggestions**: AI understands existing architecture
5. **Reduced Hallucinations**: All changes based on actual code analysis

## Context Memory Management

The system automatically:
- Caches context for performance
- Limits context size to prevent token overflow
- Prioritizes recently accessed and relevant files
- Clears stale context to maintain accuracy

Use `clear-and-replace` strategically to maintain optimal context size and relevance.