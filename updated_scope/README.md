# CCDyad System Documentation

This documentation provides a comprehensive analysis of the CCDyad AI-powered development platform, covering all major systems and components.

## Documentation Structure

### Core Systems
- [AI Prompt System](./01_ai_prompt_system.md) - Complete AI agent prompting and instruction system
- [App Creation & Templates](./02_app_creation_templates.md) - How apps are created from templates
- [Preview & Development](./03_preview_development.md) - Live preview and development server system
- [File Processing](./04_file_processing.md) - How AI responses create and modify files

### Integrations & Services
- [Supabase Integration](./05_supabase_integration.md) - Database, auth, and serverless functions
- [GitHub Integration](./06_github_integration.md) - Version control and deployment
- [Process Management](./07_process_management.md) - App server and background process handling

### Architecture & UI
- [Database Schema](./08_database_schema.md) - SQLite database structure and models
- [Frontend Architecture](./09_frontend_architecture.md) - React components and state management
- [Testing System](./10_testing_system.md) - E2E testing with Playwright

## Key Findings Summary

**CCDyad** is a sophisticated AI-powered development platform that:

1. **Creates full-stack applications** from natural language prompts
2. **Provides real-time preview** in an embedded iframe
3. **Integrates with cloud services** (Supabase, GitHub, Vercel)
4. **Manages the entire development lifecycle** from creation to deployment
5. **Uses structured AI prompts** with custom dyad tags for precise control
6. **Maintains version control** with automatic git commits
7. **Handles complex integrations** like authentication, databases, and serverless functions

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Agent      │    │  File System    │    │  Live Preview   │
│  (Claude API)   │◄──►│   & Git Repo    │◄──►│   (iframe)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Prompt System  │    │  Template       │    │  Dev Server     │
│  & Instructions │    │  Scaffolding    │    │  (Vite/Next)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Supabase       │    │  GitHub         │    │  Process        │
│  Integration    │    │  Integration    │    │  Management     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Key File References

### Core System Files
- `/src/prompts/system_prompt.ts` - Main AI system prompts
- `/src/prompts/supabase_prompt.ts` - Supabase integration prompts
- `/src/ipc/handlers/app_handlers.ts` - App lifecycle management
- `/src/ipc/processors/response_processor.ts` - AI response processing

### Template System
- `/scaffold/` - Default React template
- `/src/shared/templates.ts` - Template definitions
- `/src/ipc/handlers/createFromTemplate.ts` - Template instantiation

### Preview System
- `/src/components/preview_panel/PreviewIframe.tsx` - Live preview iframe
- `/src/hooks/useRunApp.ts` - App server management
- `/src/components/preview_panel/Console.tsx` - Development console

This documentation represents the complete analysis of the CCDyad codebase as of August 27, 2025.