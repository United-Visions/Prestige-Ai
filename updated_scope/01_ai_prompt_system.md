# AI Prompt System

## Overview
CCDyad uses a sophisticated multi-layered prompt system to control the AI agent's behavior when creating and modifying applications.

## Core Prompt Components

### 1. Main System Prompt (`/src/prompts/system_prompt.ts`)

The core `BUILD_SYSTEM_PROMPT` defines the AI agent "Dyad" with specific rules:

**Key Sections:**
- **Role Definition**: AI editor that creates and modifies web applications in real-time
- **Code Formatting Rules**: Critical formatting requirements
- **File Operation Tags**: Specific dyad tags for different operations
- **Guidelines**: Development best practices and constraints

**Critical Formatting Rules:**
```typescript
// MANDATORY: Never use markdown code blocks
// PROHIBITED: Using ``` for code
// REQUIRED: Only use <dyad-write> tags for ALL code output
```

**Dyad Tags System:**
- `<dyad-write path="..." description="...">content</dyad-write>` - Create/update files
- `<dyad-rename from="..." to="..."></dyad-rename>` - Rename files
- `<dyad-delete path="..."></dyad-delete>` - Delete files
- `<dyad-add-dependency packages="package1 package2"></dyad-add-dependency>` - Install packages
- `<dyad-execute-sql description="...">SQL</dyad-execute-sql>` - Execute database queries
- `<dyad-add-integration provider="supabase"></dyad-add-integration>` - Add service integrations

### 2. AI Rules File (`/scaffold/AI_RULES.md`)

Each app gets a custom `AI_RULES.md` file that defines the tech stack:

```markdown
# Tech Stack
- You are building a React application
- Use TypeScript
- Use React Router (keep routes in src/App.tsx)
- Put source code in src folder
- Put pages into src/pages/
- Put components into src/components/
- The main page is src/pages/Index.tsx
- ALWAYS try to use shadcn/ui library
- Tailwind CSS for styling
```

**Default Rules Location:** `/scaffold/AI_RULES.md`

### 3. Thinking Prompt

The AI uses structured thinking with `<think></think>` tags:

```typescript
export const THINKING_PROMPT = `
# Thinking Process
Before responding to user requests, ALWAYS use <think></think> tags to carefully plan your approach.

Example structure:
<think>
• **Identify the specific issue**
• **Examine relevant components**  
• **Diagnose potential causes**
• **Plan approach**
• **Consider improvements**
</think>
`;
```

### 4. Dynamic Prompt Construction

**File:** `/src/prompts/system_prompt.ts`

```typescript
export const constructSystemPrompt = ({
  aiRules,
  chatMode = "build",
}: {
  aiRules: string | undefined;
  chatMode?: "build" | "ask";
}) => {
  const systemPrompt = chatMode === "ask" ? ASK_MODE_SYSTEM_PROMPT : BUILD_SYSTEM_PROMPT;
  return systemPrompt.replace("[[AI_RULES]]", aiRules ?? DEFAULT_AI_RULES);
};
```

**Dynamic Components:**
- Base system prompt (build vs ask mode)
- App-specific AI rules
- Supabase integration prompts (conditional)
- Image handling instructions (conditional)

## Chat Modes

### Build Mode
- **Purpose**: Create and modify applications
- **Features**: Full dyad tag support, file operations, integrations
- **Restrictions**: Must use specific formatting rules

### Ask Mode  
- **Purpose**: Answer questions and provide guidance
- **Features**: Explanations, best practices, conceptual help
- **Restrictions**: **CANNOT write any code or use dyad tags**

**Ask Mode Prohibition:**
```typescript
const ASK_MODE_SYSTEM_PROMPT = `
**ABSOLUTE PRIMARY DIRECTIVE: YOU MUST NOT, UNDER ANY CIRCUMSTANCES, WRITE OR GENERATE CODE.**
* This is a complete and total prohibition
* This includes code snippets, syntax examples, file content
* Any use of <dyad-write>, <dyad-edit>, or any <dyad-*> tags is STRICTLY FORBIDDEN
`;
```

## Prompt Processing Flow

### 1. Base Prompt Assembly (`/src/ipc/handlers/chat_stream_handlers.ts`)

```typescript
let systemPrompt = constructSystemPrompt({
  aiRules: await readAiRules(getDyadAppPath(updatedChat.app.path)),
  chatMode: updatedChat.chatMode || "build",
});
```

### 2. Conditional Additions

**Supabase Integration:**
```typescript
if (updatedChat.app.supabaseProjectId) {
  systemPrompt += "\n\n" + SUPABASE_AVAILABLE_SYSTEM_PROMPT;
} else {
  systemPrompt += "\n\n" + SUPABASE_NOT_AVAILABLE_SYSTEM_PROMPT;
}
```

**Image Handling:**
```typescript
if (hasImageAttachments) {
  systemPrompt += `
You can see images in this conversation. When analyzing images:
- Describe what you see in detail
- Identify UI components, layouts, and design patterns
- Suggest improvements or implementations based on the visual content
`;
}
```

### 3. Final Prompt Structure

```
[BASE SYSTEM PROMPT]
+
[APP-SPECIFIC AI RULES]
+
[CONDITIONAL INTEGRATIONS]
+
[CONDITIONAL FEATURES]
=
[FINAL SYSTEM PROMPT]
```

## AI Rules Management

### Reading AI Rules (`/src/prompts/system_prompt.ts`)

```typescript
export const readAiRules = async (dyadAppPath: string) => {
  const aiRulesPath = path.join(dyadAppPath, "AI_RULES.md");
  try {
    const aiRules = await fs.promises.readFile(aiRulesPath, "utf8");
    return aiRules;
  } catch (error) {
    logger.info(`Error reading AI_RULES.md, fallback to default AI rules: ${error}`);
    return DEFAULT_AI_RULES;
  }
};
```

### Default AI Rules Fallback

```typescript
const DEFAULT_AI_RULES = `# Tech Stack
- You are building a React application.
- Use TypeScript.
- Use React Router. KEEP the routes in src/App.tsx
- Always put source code in the src folder.
- Put pages into src/pages/
- Put components into src/components/
- The main page (default page) is src/pages/Index.tsx
- UPDATE the main page to include the new components. OTHERWISE, the user can NOT see any components!
- ALWAYS try to use the shadcn/ui library.
- Tailwind CSS: always use Tailwind CSS for styling components.
`;
```

## Key Design Principles

### 1. **Structured Control**
- Every AI action is controlled through specific tags
- No free-form code generation in markdown blocks
- Precise file operation control

### 2. **Context Awareness**
- App-specific rules override defaults
- Integration-aware prompting
- Mode-specific behavior

### 3. **Safety & Consistency**
- Strict formatting requirements prevent errors
- Clear separation between build and ask modes
- Fallback mechanisms for missing configurations

### 4. **Extensibility**
- Easy to add new integrations
- Conditional prompt assembly
- Template-based rule system

## Related Files

- **Main Prompt System**: `/src/prompts/system_prompt.ts`
- **Supabase Prompts**: `/src/prompts/supabase_prompt.ts`
- **Chat Stream Handler**: `/src/ipc/handlers/chat_stream_handlers.ts`
- **Default Template Rules**: `/scaffold/AI_RULES.md`
- **Response Processor**: `/src/ipc/processors/response_processor.ts`