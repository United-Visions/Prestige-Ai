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

## Future Enhancements

- Additional integration providers
- Enhanced error handling in tag processing
- Real-time collaboration tags
- Deployment automation tags
- Testing framework tags

---

*This documentation is auto-generated based on code analysis. Last updated: sep 2025*