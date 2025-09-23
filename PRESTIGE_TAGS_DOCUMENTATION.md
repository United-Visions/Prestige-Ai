# Prestige AI Tags & References Documentation

This document provides a comprehensive overview of all Prestige AI tags, their purposes, and dyad references within the codebase.

## Overview

Prestige AI uses a custom tag system inspired by [dyad](https://github.com/dyad-sh) to handle AI-driven application development. These tags enable structured communication between AI models and the application, allowing for automated file operations, dependency management, and app lifecycle control.

## Prestige Tag Categories

### 1. File Operation Tags

#### `<prestige-write>`
**Purpose**: Create or update files in the project
**Location**: `src/services/agentResponseProcessor.ts`, `src/prompts/system_prompt.ts`
**Usage**:
```xml
<prestige-write path="src/components/Button.jsx" description="Creating a new Button component">
export function Button({ children, onClick }) {
  return <button onClick={onClick}>{children}</button>;
}
</prestige-write>
```
**Implementation**: Parsed by `parsePrestigeTags()` function, writes content to specified file path

#### `<prestige-rename>`
**Purpose**: Rename files or directories
**Location**: `src/services/agentResponseProcessor.ts`
**Usage**:
```xml
<prestige-rename from="src/components/OldComponent.jsx" to="src/components/NewComponent.jsx"></prestige-rename>
```
**Implementation**: Uses file system rename operations

#### `<prestige-delete>`
**Purpose**: Remove files or directories
**Location**: `src/services/agentResponseProcessor.ts`
**Usage**:
```xml
<prestige-delete path="src/components/UnusedComponent.jsx"></prestige-delete>
```
**Implementation**: Uses file system delete operations

### 2. Dependency Management Tags

#### `<prestige-add-dependency>`
**Purpose**: Install npm packages
**Location**: `src/services/agentResponseProcessor.ts`, `src/prompts/system_prompt.ts`
**Usage**:
```xml
<prestige-add-dependency packages="react-router-dom @types/node lodash"></prestige-add-dependency>
```
**Implementation**: Parses package names and triggers npm/pnpm install

#### `<prestige-setup-env>`
**Purpose**: Setup API keys and environment variables for external services
**Location**: `src/services/agentResponseProcessor.ts`, `src/prompts/system_prompt.ts`
**Usage**:
```xml
<prestige-setup-env service="Bible API" apiKey="BIBLE_API_KEY" description="Access to Bible verses and chapters">
This app uses the Bible API to fetch verses and chapters. Get a free API key from api.scripture.api.bible
</prestige-setup-env>
```
**Implementation**: Creates/updates .env file with API key placeholders, shows user-friendly setup UI

### 3. Application Control Tags

#### `<prestige-command>`
**Purpose**: Execute app lifecycle commands
**Location**: `src/services/agentResponseProcessor.ts`, `src/prompts/system_prompt.ts`
**Usage**:
```xml
<prestige-command type="rebuild"></prestige-command>
<prestige-command type="restart"></prestige-command>
<prestige-command type="refresh"></prestige-command>
```
**Implementation**: Triggers corresponding app management operations

### 4. Communication Tags

#### `<prestige-chat-summary>`
**Purpose**: Set conversation summary/title
**Location**: Multiple files across `src/services/` and `src/prompts/`
**Usage**:
```xml
<prestige-chat-summary>Added authentication system</prestige-chat-summary>
```
**Implementation**: Extracted and used for conversation titles

### 5. Integration Tags

#### `<prestige-add-integration>`
**Purpose**: Add third-party service integrations
**Location**: `src/prompts/integration_prompts.ts`
**Usage**:
```xml
<prestige-add-integration provider="supabase"></prestige-add-integration>
<prestige-add-integration provider="github"></prestige-add-integration>
<prestige-add-integration provider="vercel"></prestige-add-integration>
```
**Implementation**: Triggers integration setup workflows

### 6. System Tags

#### `<prestige-proxy-server>`
**Purpose**: Proxy server communication for live preview
**Location**: `src/components/code/CodeViewerPanel.tsx`, `src/hooks/useRunApp.ts`, `electron/advancedAppManager.ts`
**Usage**: Internal system message format
```
[prestige-proxy-server]started=[http://localhost:3001] original=[http://localhost:3000]
```
**Implementation**: Enables live preview by proxying dev server URLs

## Application Infrastructure

### Storage & Caching
- **prestige-ai folder**: Main project directory on desktop (`~/Desktop/prestige-ai/`)
- **prestige-ai.db**: SQLite database for app metadata
- **prestige-ai-store**: Zustand store persistence key
- **prestige-ui-theme**: Theme storage key
- **.prestige-ai.json**: App metadata files
- **.prestige-cache-meta.json**: Template cache metadata

### Security
- **prestige-ai-secure-key-2024**: Encryption key for token storage
- **prestige-salt**: Salt for cryptographic operations

### Styling
- **prestige-gradient-text**: CSS class for gradient text
- **prestige-gradient-bg**: CSS class for gradient backgrounds
- **prestige-card**: CSS class for card components
- **prestige-button-primary**: CSS class for primary buttons

## Dyad References & Inspiration

The Prestige AI codebase contains numerous references to dyad, indicating it was built as an enhanced version inspired by the dyad project:

### Architecture References
- **Process management**: Uses dyad-style process tree killing and port management
- **Proxy server**: Implements dyad-style URL detection and proxying
- **Tag system**: Enhanced version of dyad's custom tag parsing
- **Auto-fix system**: Similar to dyad's error detection and fixing
- **Streaming**: Inspired by dyad's AI streaming implementation

### Template Sources
- Next.js template: `https://github.com/dyad-sh/nextjs-template`
- Vue template: `https://github.com/dyad-sh/vue-template`
- Astro template: `https://github.com/dyad-sh/astro-template`

### Code Comments
Throughout the codebase, comments reference dyad patterns:
- "Similar to CCdyad's approach"
- "Enhanced version of dyad's implementation"
- "Based on @dyad's implementation"
- "Like @dyad's behavior"

## Tag Processing Pipeline

1. **AI Response**: Model generates response with prestige tags
2. **Tag Parsing**: `parsePrestigeTags()` extracts operations and content
3. **Operation Execution**: File operations, dependency installs, commands executed
4. **State Update**: App state and virtual filesystem updated
5. **UI Refresh**: Components re-render with new state

## Security Considerations

- All file operations are scoped to the app's directory
- Tag parsing sanitizes input to prevent injection attacks
- Encryption used for sensitive token storage
- File system operations use safe path resolution

## Development Guidelines

### When to Use Each Tag
- **prestige-write**: For all code file creation/updates
- **prestige-add-dependency**: When new packages are needed
- **prestige-command**: To trigger app rebuilds/restarts
- **prestige-chat-summary**: Always include for conversation tracking
- **prestige-add-integration**: For third-party service setup

### Best Practices
1. Always close prestige tags properly
2. Use descriptive file paths in prestige-write
3. Include meaningful descriptions in prestige-write tags
4. Only one prestige-write block per file
5. Place prestige-chat-summary at the end of responses

## Troubleshooting

### Common Issues
1. **Preview not showing**: Check prestige-proxy-server message format
2. **File operations failing**: Verify app paths and permissions
3. **Dependencies not installing**: Check package manager availability
4. **Tags not parsing**: Ensure proper XML syntax

### Debug Information
- Logs available in browser dev tools
- App state in Zustand store
- File operations logged in main process
- Proxy server status in preview panel

## Prestige AI Block System

### Overview
Inspired by dyad's block-based response system, Prestige AI now features animated, interactive blocks that provide real-time visual feedback during AI streaming responses.

### Block Components

#### **PrestigeThinkBlock** (`src/components/chat/blocks/PrestigeThinkBlock.tsx`)
- **Purpose**: Display AI's thinking process with collapsible content
- **Visual**: Purple gradient background with Brain icon
- **Animation**: Auto-expands during streaming, collapses when finished
- **Features**: Animated dots indicator, smooth transitions

#### **PrestigeWriteBlock** (`src/components/chat/blocks/PrestigeWriteBlock.tsx`)
- **Purpose**: Show file creation/editing operations
- **Visual**: Green gradient background with FileText icon
- **Animation**: Progress bar during execution, checkmark when complete
- **Features**: File path display, syntax highlighting, status indicators

#### **PrestigeAddDependencyBlock** (`src/components/chat/blocks/PrestigeAddDependencyBlock.tsx`)
- **Purpose**: Display package installation operations
- **Visual**: Blue gradient background with Download icon
- **Animation**: Individual package progress indicators
- **Features**: Package list display, installation status per package

#### **PrestigeCommandBlock** (`src/components/chat/blocks/PrestigeCommandBlock.tsx`)
- **Purpose**: Show application lifecycle commands
- **Visual**: Orange gradient background with command-specific icons
- **Animation**: Terminal-style output with typing cursor
- **Features**: Command output simulation, status feedback

#### **PrestigeAddIntegrationBlock** (`src/components/chat/blocks/PrestigeAddIntegrationBlock.tsx`)
- **Purpose**: Display third-party service integrations
- **Visual**: Indigo gradient background with provider-specific icons
- **Animation**: Setup step progression
- **Features**: Provider branding, setup checklist, status tracking

### Block States
```typescript
type PrestigeBlockState = "pending" | "finished" | "aborted";
```
- **pending**: Block is actively processing (shows animations)
- **finished**: Block has completed successfully (shows completion state)
- **aborted**: Block was cancelled or failed (shows error state)

### Integration Components

#### **PrestigeBlockRenderer** (`src/components/chat/blocks/PrestigeBlockRenderer.tsx`)
- Main component that parses content and renders appropriate blocks
- Handles both complete and incomplete tags during streaming
- Supports all Prestige AI tags with animated states

#### **StreamingAgentProcessor** (`src/services/streamingAgentProcessor.ts`)
- Enhanced processor with real-time state management
- Tracks streaming operations and block states
- Handles partial tag parsing and completion detection

### Usage Examples

#### Basic Integration
```tsx
import { PrestigeBlockRenderer } from '@/components/chat/blocks/PrestigeBlockRenderer';

<PrestigeBlockRenderer
  content={aiResponse}
  isStreaming={isStreamingActive}
/>
```

#### With Streaming Processor
```tsx
import { useStreamingAgentProcessor } from '@/services/streamingAgentProcessor';

const { processStreamingChunk, processFinalResponse } = useStreamingAgentProcessor();

// During streaming
processStreamingChunk(streamId, chunk, fullResponse, (operations) => {
  // Handle block state updates
});

// When streaming completes
processFinalResponse(streamId, finalResponse, true);
```

### Demo Component
**PrestigeBlockDemo** (`src/components/chat/blocks/PrestigeBlockDemo.tsx`)
- Interactive demonstration of all block types
- Simulates streaming responses with step-by-step progression
- Shows all block states and animations in action

### Key Features

1. **Real-time Animation**: Blocks animate during streaming and show completion states
2. **State Management**: Tracks pending, finished, and aborted states for each operation
3. **Interactive UI**: Collapsible blocks with smooth transitions
4. **Progress Indicators**: Visual feedback for ongoing operations
5. **Error Handling**: Graceful handling of incomplete or malformed tags
6. **Backward Compatibility**: Works alongside existing Prestige components

### Performance Optimizations

- Efficient tag parsing with regex optimization
- Memoized content processing
- Smooth CSS transitions instead of JavaScript animations
- Incremental block state updates during streaming

## Future Enhancements

- Additional integration providers (AWS, Azure, Firebase)
- Enhanced error handling in tag processing
- Real-time collaboration tags
- Deployment automation tags
- Testing framework tags
- Block drag-and-drop reordering
- Custom block themes and animations
- Block export/import functionality

---

*This documentation is auto-generated based on code analysis. Last updated: Sep 2025*
*Block system implementation completed with dyad-inspired architecture*