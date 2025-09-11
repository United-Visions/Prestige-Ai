# Supabase Integration System

## Overview
CCDyad provides comprehensive Supabase integration including authentication, database operations, edge functions, and real-time features with automatic deployment and management.

## Dynamic Prompt Integration

### 1. Conditional Prompt Injection (`/src/ipc/handlers/chat_stream_handlers.ts`)

```typescript
// Dynamic Supabase prompt based on project status
if (updatedChat.app.supabaseProjectId) {
  systemPrompt += "\n\n" + SUPABASE_AVAILABLE_SYSTEM_PROMPT + 
    "\n\n" + getSupabaseClientCode(updatedChat.app.supabaseProjectId);
} else {
  systemPrompt += "\n\n" + SUPABASE_NOT_AVAILABLE_SYSTEM_PROMPT;
}
```

### 2. Supabase Prompts (`/src/prompts/supabase_prompt.ts`)

**Available System Prompt (when integrated):**
```typescript
export const SUPABASE_AVAILABLE_SYSTEM_PROMPT = `
# Supabase Instructions

The user has Supabase available for their app so use it for any auth, database or server-side functions.

Make sure supabase client exists at src/integrations/supabase/client.ts. If it doesn't exist, create it.

NOTE: I will replace $$SUPABASE_CLIENT_CODE$$ with the actual code.

Example output:
<dyad-write path="src/integrations/supabase/client.ts" description="Creating a supabase client.">
$$SUPABASE_CLIENT_CODE$$
</dyad-write>

<dyad-add-dependency packages="@supabase/supabase-js"></dyad-add-dependency>
`;
```

**Not Available Prompt (shows integration button):**
```typescript
export const SUPABASE_NOT_AVAILABLE_SYSTEM_PROMPT = `
If the user wants to use supabase or do something that requires auth, database or server-side functions,
tell them that they need to add supabase to their app.

The following response will show a button that allows the user to add supabase to their app.

<dyad-add-integration provider="supabase"></dyad-add-integration>

# Examples

## Example 1: User wants to use Supabase
### User prompt: I want to use supabase in my app.
### Assistant response:
You need to first add Supabase to your app.
<dyad-add-integration provider="supabase"></dyad-add-integration>

## Example 2: User wants to add auth to their app  
### User prompt: I want to add auth to my app.
### Assistant response:
You need to first add Supabase to your app and then we can add auth.
<dyad-add-integration provider="supabase"></dyad-add-integration>
`;
```

## Authentication System

### 1. Auth Setup Instructions

**Complete Auth Flow from Prompt:**
```typescript
// When asked to add authentication, always follow these steps:

// 1. User Profile Assessment:
//    - Confirm if user profile data storage is needed (username, roles, avatars)
//    - If yes: Create profiles table migration
//    - If no: Proceed with basic auth setup

// 2. Core Authentication Setup:
//    a. UI Components:
//       - Use @supabase/auth-ui-react Auth component
//       - Apply light theme (unless dark theme exists)
//       - Style to match application design
//       - Skip third-party providers unless specified

//    b. Session Management:
//       - Wrap app with SessionContextProvider (create this yourself)
//       - Import supabase client from @/lib/supabaseClient
//       - Implement auth state monitoring using supabase.auth.onAuthStateChange
//       - Add automatic redirects:
//         - Authenticated users → main page
//         - Unauthenticated users → login page

//    c. Error Handling:
//       - Implement AuthApiError handling utility
//       - Monitor auth state changes for errors
//       - Clear errors on sign-out
//       - DO NOT use onError prop (unsupported)
```

### 2. Login State Management Template

```typescript
// From prompt examples:
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'USER_UPDATED' || event === 'SIGNED_IN') {
      const { error } = await supabase.auth.getSession();
      // Other code here
    }
    if (event === 'SIGNED_OUT') {
      // Other code here
    }
  });

  return () => subscription.unsubscribe();
}, []);
```

### 3. Login Page Template

```typescript
// Generated via <dyad-write> tag:
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

function Login() {
  return (
    <Auth
      supabaseClient={supabase}
      providers={[]}
      appearance={{
        theme: ThemeSupa,
      }}
      theme="light"
    />
  );
}
```

## Database Operations

### 1. SQL Execution Tag

**Direct SQL Execution:**
```typescript
// Usage in AI responses:
<dyad-execute-sql description="Get all users">
SELECT * FROM users;
</dyad-execute-sql>

// Processing in response_processor.ts:
if (dyadExecuteSqlQueries.length > 0) {
  for (const query of dyadExecuteSqlQueries) {
    try {
      await executeSupabaseSql({
        supabaseProjectId: chatWithApp.app.supabaseProjectId!,
        query: query.content,
      });
    } catch (error) {
      errors.push({
        message: `Failed to execute SQL query: ${query.content}`,
        error: error,
      });
    }
  }
}
```

### 2. Supabase Management Client (`/src/supabase_admin/supabase_management_client.ts`)

**SQL Execution:**
```typescript
export async function executeSupabaseSql({
  supabaseProjectId,
  query,
}: {
  supabaseProjectId: string;
  query: string;
}): Promise<string> {
  const url = `${SUPABASE_ADMIN_BASE_URL}/v1/projects/${supabaseProjectId}/database/query`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorBody = await safeParseErrorResponseBody(response);
    throw new Error(`Failed to execute SQL: ${response.status} ${response.statusText}. ${errorBody?.message || ""}`);
  }

  const result = await response.json();
  return JSON.stringify(result, null, 2);
}
```

### 3. User Profiles System

**Profiles Table Creation:**
```sql
-- From prompt template:
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  PRIMARY KEY (id)
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles for select using ( true );
create policy "Users can insert their own profile." on profiles for insert with check ( auth.uid() = id );
create policy "Users can update own profile." on profiles for update using ( auth.uid() = id );
```

**Auto-Profile Creation Function:**
```sql
-- Automatically insert profile when user signs up:
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name');
  RETURN new;
END;
$$;

-- Trigger the function on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

## Edge Functions System

### 1. Auto-Deployment (`/src/ipc/processors/response_processor.ts`)

**Function Detection:**
```typescript
function isServerFunction(filePath: string): boolean {
  return filePath.startsWith("supabase/functions/");
}

function getFunctionNameFromPath(input: string): string {
  return path.basename(path.extname(input) ? path.dirname(input) : input);
}

// Auto-deploy when functions are written
if (isServerFunction(filePath)) {
  try {
    await deploySupabaseFunctions({
      supabaseProjectId: chatWithApp.app.supabaseProjectId!,
      functionName: path.basename(path.dirname(filePath)),
      content: content,
    });
  } catch (error) {
    errors.push({
      message: `Failed to deploy Supabase function: ${filePath}`,
      error: error,
    });
  }
}
```

### 2. Function Deployment (`/src/supabase_admin/supabase_management_client.ts`)

```typescript
export async function deploySupabaseFunctions({
  supabaseProjectId,
  functionName,
  content,
}: {
  supabaseProjectId: string;
  functionName: string;
  content: string;
}): Promise<void> {
  logger.info(`Deploying Supabase function: ${functionName} to project: ${supabaseProjectId}`);
  
  const url = `${SUPABASE_ADMIN_BASE_URL}/v1/projects/${supabaseProjectId}/functions/${functionName}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug: functionName,
      name: functionName,
      source: content,
      entrypoint: "index.ts",
      verify_jwt: false,
    }),
  });

  if (!response.ok) {
    await createResponseError(response, "deploy function");
  }
}
```

### 3. Edge Function Template

**Standard Function Structure:**
```typescript
// From prompt template:
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Function logic here
    const { data, error } = await supabaseClient
      .from('your_table')
      .select('*')

    if (error) throw error

    return new Response(
      JSON.stringify({ data }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 400 
      },
    )
  }
})
```

### 4. Environment Variables

**Pre-configured Secrets:**
- `SUPABASE_URL` - Project URL
- `SUPABASE_ANON_KEY` - Public API key
- `SUPABASE_SERVICE_ROLE_KEY` - Admin API key
- `SUPABASE_DB_URL` - Direct database connection

**Custom Secrets Management:**
- Users set via Supabase Console: Project → Edge Functions → Manage Secrets
- Referenced in functions via `Deno.env.get('SECRET_NAME')`
- No manual CLI setup required

## Project Management

### 1. Project Connection (`/src/ipc/ipc_client.ts`)

**Project Management Methods:**
```typescript
public async listSupabaseProjects(): Promise<any[]> {
  return this.ipcRenderer.invoke("supabase:list-projects");
}

public async setSupabaseAppProject(project: string, app: number): Promise<void> {
  await this.ipcRenderer.invoke("supabase:set-app-project", { project, app });
}

public async unsetSupabaseAppProject(app: number): Promise<void> {
  await this.ipcRenderer.invoke("supabase:unset-app-project", { app });
}

public async fakeHandleSupabaseConnect(params: {
  appId: number;
  fakeProjectId: string;
}): Promise<void> {
  await this.ipcRenderer.invoke("supabase:fake-connect-and-set-project", params);
}
```

### 2. Project Listing (`/src/supabase_admin/supabase_management_client.ts`)

```typescript
export async function listSupabaseProjects(): Promise<any[]> {
  const url = `${SUPABASE_ADMIN_BASE_URL}/v1/projects`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    await createResponseError(response, "list projects");
  }

  return response.json();
}

export async function getSupabaseProjectName(projectId: string): Promise<string> {
  const projects = await listSupabaseProjects();
  const project = projects.find(p => p.id === projectId);
  return project?.name || projectId;
}
```

## Client Setup

### 1. Client Code Generation

**Dynamic Client Code Injection:**
```typescript
function getSupabaseClientCode(supabaseProjectId: string): string {
  return `
// Auto-generated Supabase client code
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = '${getSupabaseUrl(supabaseProjectId)}'
const supabaseAnonKey = '${getSupabaseAnonKey(supabaseProjectId)}'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
`;
}
```

### 2. Client File Creation

**Automatic Client Setup:**
```typescript
// When AI creates Supabase client:
<dyad-write path="src/integrations/supabase/client.ts" description="Creating a supabase client.">
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
</dyad-write>

<dyad-add-dependency packages="@supabase/supabase-js"></dyad-add-dependency>
```

## Migration System

### 1. SQL Migration Files (`/src/ipc/utils/file_utils.ts`)

```typescript
export async function writeMigrationFile(
  appPath: string,
  sqlContent: string,
  description: string,
): Promise<void> {
  const migrationsDir = path.join(appPath, "supabase", "migrations");
  fs.mkdirSync(migrationsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${timestamp}_${description.replace(/\s+/g, "_").toLowerCase()}.sql`;
  const migrationPath = path.join(migrationsDir, filename);

  fs.writeFileSync(migrationPath, sqlContent);
  logger.info(`Created migration file: ${filename}`);
}
```

### 2. Migration Integration

**Automatic Migration Creation:**
```typescript
// When SQL is executed, optionally create migration file
if (settings.enableSupabaseWriteSqlMigration) {
  try {
    await writeMigrationFile(appPath, query.content, query.description);
    writtenSqlMigrationFiles++;
  } catch (error) {
    errors.push({
      message: `Failed to write SQL migration file for: ${query.description}`,
      error: error,
    });
  }
}
```

## Function Invocation

### 1. Client-Side Invocation

**Recommended Pattern:**
```typescript
// Use supabase.functions.invoke() method
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { key: 'value' }
})

// NOT recommended: raw HTTP requests
// fetch() or axios should be avoided
```

### 2. URL Construction

**Hardcoded URLs Required:**
```typescript
// Format: https://SUPABASE_PROJECT_ID.supabase.co/functions/v1/EDGE_FUNCTION_NAME
// Environment variables are not supported - always use full hardcoded URLs

const response = await fetch(
  'https://abcdefghijklmnop.supabase.co/functions/v1/my-function',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  }
)
```

## Error Handling

### 1. SQL Error Management

```typescript
try {
  await executeSupabaseSql({ supabaseProjectId, query: query.content });
} catch (error) {
  errors.push({
    message: `Failed to execute SQL query: ${query.content}`,
    error: error,
  });
}
```

### 2. Function Deployment Errors

```typescript
async function createResponseError(response: Response, action: string) {
  const errorBody = await safeParseErrorResponseBody(response);
  const message = `Failed to ${action}: ${response.status} ${response.statusText}. ${errorBody?.message || ""}`;
  logger.error(message);
  throw new Error(message);
}
```

## Security Considerations

### 1. Row Level Security (RLS)

**Automatic RLS Setup:**
- All user tables created with RLS enabled
- Policies for select, insert, update operations
- User isolation via `auth.uid()` function

### 2. API Key Management

**Key Types:**
- **Anon Key**: Public, safe for client-side use
- **Service Role Key**: Admin access, server-side only
- **Custom Secrets**: Environment variables for Edge Functions

### 3. CORS Configuration

**Edge Function CORS:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Always handle OPTIONS requests
if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}
```

## Related Files

- **Supabase Prompts**: `/src/prompts/supabase_prompt.ts`
- **Management Client**: `/src/supabase_admin/supabase_management_client.ts`
- **Utilities**: `/src/supabase_admin/supabase_utils.ts`
- **Chat Handlers**: `/src/ipc/handlers/chat_stream_handlers.ts`
- **Response Processor**: `/src/ipc/processors/response_processor.ts`
- **IPC Client**: `/src/ipc/ipc_client.ts`