# App Creation & Templates

## Overview
CCDyad creates applications from predefined templates, providing a solid foundation with pre-configured tooling, dependencies, and project structure.

## App Creation Flow

### 1. Creation Trigger (`/src/ipc/handlers/app_handlers.ts`)

```typescript
handle("create-app", async (_, params: CreateAppParams): Promise<{ app: any; chatId: number }> => {
  const appPath = params.name;
  const fullAppPath = getDyadAppPath(appPath);
  
  // Check if app exists
  if (fs.existsSync(fullAppPath)) {
    throw new Error(`App already exists at: ${fullAppPath}`);
  }
  
  // Create database entry
  const [app] = await db.insert(apps).values({
    name: params.name,
    path: appPath,
  }).returning();
  
  // Create initial chat
  const [chat] = await db.insert(chats).values({
    appId: app.id,
  }).returning();
  
  // Create from template
  await createFromTemplate({ fullAppPath });
  
  // Initialize git repo
  await git.init({ fs, dir: fullAppPath, defaultBranch: "main" });
  await git.add({ fs, dir: fullAppPath, filepath: "." });
  
  const commitHash = await gitCommit({
    path: fullAppPath,
    message: "Init Dyad app",
  });
  
  return { app, chatId: chat.id };
});
```

### 2. Template Selection (`/src/shared/templates.ts`)

```typescript
export interface Template {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  githubUrl?: string;
  isOfficial: boolean;
}

export const templatesData: Template[] = [
  {
    id: "react",
    title: "React.js Template",
    description: "Uses React.js, Vite, Shadcn, Tailwind and TypeScript.",
    imageUrl: "https://github.com/user-attachments/assets/5b700eab-b28c-498e-96de-8649b14c16d9",
    isOfficial: true,
  },
  {
    id: "next",
    title: "Next.js Template", 
    description: "Uses Next.js, React.js, Shadcn, Tailwind and TypeScript.",
    imageUrl: "https://github.com/user-attachments/assets/96258e4f-abce-4910-a62a-a9dff77965f2",
    githubUrl: "https://github.com/United-Visions/nextjs-template",
    isOfficial: true,
  },
];
```

### 3. Template Instantiation (`/src/ipc/handlers/createFromTemplate.ts`)

```typescript
export async function createFromTemplate({ fullAppPath }: { fullAppPath: string }) {
  const settings = readSettings();
  const templateId = settings.selectedTemplateId ?? DEFAULT_TEMPLATE_ID;

  if (templateId === "react") {
    // Use local scaffold directory
    await copyDirectoryRecursive(
      path.join(__dirname, "..", "..", "scaffold"),
      fullAppPath,
    );
    return;
  }

  // Use GitHub template
  const template = getTemplateOrThrow(templateId);
  if (!template.githubUrl) {
    throw new Error(`Template ${templateId} has no GitHub URL`);
  }
  
  const repoCachePath = await cloneRepo(template.githubUrl);
  await copyRepoToApp(repoCachePath, fullAppPath);
}
```

## Template Types

### 1. Local React Template (`/scaffold/`)

**Structure:**
```
scaffold/
├── .gitignore
├── AI_RULES.md          # Tech stack rules for AI
├── components.json      # shadcn/ui configuration
├── eslint.config.js
├── index.html
├── package.json         # Pre-configured dependencies
├── pnpm-lock.yaml
├── postcss.config.js
├── README.md
├── tailwind.config.ts   # Tailwind configuration
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts       # Vite build configuration
├── public/
│   └── (static assets)
└── src/
    ├── App.tsx         # Main app with routing
    ├── main.tsx        # Entry point
    ├── components/
    │   ├── made-with-dyad.tsx
    │   └── ui/         # Full shadcn/ui component library
    ├── hooks/
    ├── lib/
    ├── pages/
    │   ├── Index.tsx   # Landing page
    │   └── NotFound.tsx
    └── utils/
```

**Key Files:**

**`/scaffold/package.json`** - Comprehensive dependency setup:
```json
{
  "name": "vite_react_shadcn_ts",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@radix-ui/react-accordion": "^1.2.0",
    "@radix-ui/react-alert-dialog": "^1.1.1",
    // ... 40+ pre-installed UI components
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2",
    "tailwind-merge": "^2.5.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@dyad-sh/react-vite-component-tagger": "^0.8.0",
    "typescript": "^5.5.3",
    "vite": "^6.3.4"
  }
}
```

**`/scaffold/src/App.tsx`** - Pre-configured routing:
```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
```

**`/scaffold/AI_RULES.md`** - AI guidance:
```markdown
# Tech Stack
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

Available packages and libraries:
- The lucide-react package is installed for icons.
- You ALREADY have ALL the shadcn/ui components and their dependencies installed.
- You have ALL the necessary Radix UI components installed.
```

### 2. GitHub Templates

**Next.js Template:** `https://github.com/United-Visions/nextjs-template`

**Caching System:**
```typescript
async function cloneRepo(repoUrl: string): Promise<string> {
  const cachePath = path.join(
    app.getPath("userData"),
    "templates",
    orgName,
    repoName,
  );

  if (fs.existsSync(cachePath)) {
    // Check for updates via GitHub API
    const apiUrl = `https://api.github.com/repos/${orgName}/${repoName}/commits/HEAD`;
    const response = await http.request({ url: apiUrl });
    
    if (response.statusCode === 200) {
      const commitData = JSON.parse(responseBodyStr);
      const remoteSha = commitData.sha;
      const localSha = await git.resolveRef({ fs, dir: cachePath, ref: "HEAD" });
      
      if (remoteSha === localSha) {
        return cachePath; // Use cached version
      } else {
        fs.rmSync(cachePath, { recursive: true, force: true });
        // Proceed to clone fresh version
      }
    }
  }

  await git.clone({
    fs, http, dir: cachePath, url: repoUrl,
    singleBranch: true, depth: 1,
  });
  
  return cachePath;
}
```

## Pre-installed Dependencies

### Core Framework
- **React 18.3.1** - UI library
- **TypeScript 5.5.3** - Type safety
- **Vite 6.3.4** - Build tool and dev server

### UI Components (shadcn/ui + Radix UI)
```json
{
  "@radix-ui/react-accordion": "^1.2.0",
  "@radix-ui/react-alert-dialog": "^1.1.1", 
  "@radix-ui/react-avatar": "^1.1.0",
  "@radix-ui/react-checkbox": "^1.1.1",
  "@radix-ui/react-dialog": "^1.1.2",
  "@radix-ui/react-dropdown-menu": "^2.1.1",
  "@radix-ui/react-popover": "^1.1.1",
  "@radix-ui/react-select": "^2.1.1",
  "@radix-ui/react-tabs": "^1.1.0",
  "@radix-ui/react-toast": "^1.2.1",
  // ... 20+ more UI components
}
```

### Styling & Utilities
- **TailwindCSS** - Utility-first CSS
- **class-variance-authority** - Component variants
- **clsx** - Conditional classnames
- **tailwind-merge** - Merge Tailwind classes
- **lucide-react** - Icon library

### Routing & Data
- **react-router-dom** - Client-side routing
- **@tanstack/react-query** - Data fetching
- **react-hook-form** - Form handling
- **zod** - Schema validation

### Development Tools
- **@dyad-sh/react-vite-component-tagger** - Component selection for AI

## App Structure Created

### Directory Layout
```
my-app/
├── .gitignore
├── AI_RULES.md          # AI instructions
├── package.json         # Dependencies
├── vite.config.ts       # Build config
├── tailwind.config.ts   # Styling config
├── components.json      # shadcn/ui config
├── index.html           # Entry HTML
├── public/              # Static assets
└── src/
    ├── App.tsx          # Main app + routing
    ├── main.tsx         # React entry point
    ├── globals.css      # Global styles
    ├── components/
    │   ├── made-with-dyad.tsx
    │   └── ui/          # shadcn/ui components (40+ files)
    ├── hooks/
    ├── lib/
    │   └── utils.ts     # Utility functions
    ├── pages/
    │   ├── Index.tsx    # Home page
    │   └── NotFound.tsx # 404 page
    └── utils/
```

### Git Initialization
Every app starts with:
1. **Git repository** initialized
2. **Initial commit** with message "Init Dyad app"
3. **All files staged** and committed
4. **Commit hash stored** in database for tracking

## Template Customization

### Adding New Templates
1. **Add to templates.ts**:
```typescript
{
  id: "my-template",
  title: "My Custom Template",
  description: "Custom template description",
  imageUrl: "preview-image-url",
  githubUrl: "https://github.com/user/template-repo",
  isOfficial: false,
}
```

2. **Template requirements**:
- Must include `AI_RULES.md`
- Must have `package.json` with dev script
- Should include `vite.config.ts` or equivalent
- Must work with port 32100

### Template Selection
Users can choose templates via:
- **Settings**: `selectedTemplateId` preference
- **Template Hub**: Visual template picker in UI
- **Default**: React template if none selected

## Related Files

- **App Creation Handler**: `/src/ipc/handlers/app_handlers.ts`
- **Template System**: `/src/ipc/handlers/createFromTemplate.ts`
- **Template Definitions**: `/src/shared/templates.ts`
- **Default Template**: `/scaffold/` directory
- **Git Utilities**: `/src/ipc/utils/git_utils.ts`
- **File Utilities**: `/src/ipc/utils/file_utils.ts`