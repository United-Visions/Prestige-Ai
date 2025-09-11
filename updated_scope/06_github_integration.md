# GitHub Integration System

## Overview
CCDyad provides comprehensive GitHub integration for version control, repository management, deployment workflows, and collaboration features.

## GitHub Handler System

### 1. Main GitHub Handler (`/src/ipc/handlers/github_handlers.ts`)

**Core GitHub Operations:**
```typescript
export function registerGithubHandlers() {
  handle("github:list-repos", async () => {
    return await listRepositories();
  });

  handle("github:create-repo", async (_, { name, description, isPrivate }) => {
    return await createRepository(name, description, isPrivate);
  });

  handle("github:push-app", async (_, { appId, repoUrl, message }) => {
    return await pushAppToGithub(appId, repoUrl, message);
  });

  handle("github:start-flow", async (_, args) => {
    return await startGithubFlow(args);
  });

  handle("github:check-connection", async () => {
    return await checkGithubConnection();
  });
}
```

### 2. Repository Management

**List User Repositories:**
```typescript
async function listRepositories(): Promise<GitHubRepo[]> {
  const settings = readSettings();
  if (!settings.githubToken) {
    throw new Error("GitHub token not configured");
  }

  const response = await fetch("https://api.github.com/user/repos", {
    headers: {
      "Authorization": `Bearer ${settings.githubToken}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "CCDyad-App",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const repos = await response.json();
  return repos.map((repo: any) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    url: repo.html_url,
    cloneUrl: repo.clone_url,
    isPrivate: repo.private,
    description: repo.description,
    defaultBranch: repo.default_branch,
  }));
}
```

**Create New Repository:**
```typescript
async function createRepository(
  name: string,
  description: string,
  isPrivate: boolean = false
): Promise<GitHubRepo> {
  const settings = readSettings();
  if (!settings.githubToken) {
    throw new Error("GitHub token not configured");
  }

  const response = await fetch("https://api.github.com/user/repos", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${settings.githubToken}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "CCDyad-App",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      description,
      private: isPrivate,
      auto_init: false, // Don't auto-initialize since we have content
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to create repository: ${errorData.message}`);
  }

  const repo = await response.json();
  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    url: repo.html_url,
    cloneUrl: repo.clone_url,
    isPrivate: repo.private,
    description: repo.description,
    defaultBranch: repo.default_branch,
  };
}
```

### 3. App-to-GitHub Push

**Push App to Repository:**
```typescript
async function pushAppToGithub(
  appId: number,
  repoUrl: string,
  commitMessage: string = "Initial commit from CCDyad"
): Promise<void> {
  // Get app from database
  const app = await db.query.apps.findFirst({
    where: eq(apps.id, appId),
  });

  if (!app) {
    throw new Error(`App with ID ${appId} not found`);
  }

  const appPath = getDyadAppPath(app.path);
  
  if (!fs.existsSync(appPath)) {
    throw new Error(`App directory not found: ${appPath}`);
  }

  try {
    // Add GitHub remote if not exists
    try {
      await git.addRemote({
        fs,
        dir: appPath,
        remote: "origin",
        url: repoUrl,
      });
    } catch (error) {
      // Remote might already exist, try to set URL
      await git.deleteRemote({ fs, dir: appPath, remote: "origin" });
      await git.addRemote({
        fs,
        dir: appPath,
        remote: "origin", 
        url: repoUrl,
      });
    }

    // Stage all files
    await git.add({ fs, dir: appPath, filepath: "." });

    // Commit if there are changes
    try {
      await git.commit({
        fs,
        dir: appPath,
        author: {
          name: "CCDyad",
          email: "noreply@dyad.sh",
        },
        message: commitMessage,
      });
    } catch (error) {
      // Might be no changes to commit
      logger.debug("No changes to commit:", error);
    }

    // Push to GitHub
    await git.push({
      fs,
      http,
      dir: appPath,
      remote: "origin",
      ref: "main",
      onAuth: () => ({
        username: "token",
        password: readSettings().githubToken!,
      }),
    });

    logger.info(`Successfully pushed app ${appId} to GitHub: ${repoUrl}`);
  } catch (error) {
    logger.error(`Failed to push app to GitHub:`, error);
    throw new Error(`Failed to push to GitHub: ${error.message}`);
  }
}
```

## GitHub Flow Integration

### 1. GitHub Flow Start (`/src/ipc/handlers/github_handlers.ts`)

**GitHub Flow Initialization:**
```typescript
async function startGithubFlow(args: {
  appId: number;
  repositoryName?: string;
  repositoryDescription?: string;
  isPrivate?: boolean;
  existingRepoUrl?: string;
}): Promise<{ success: boolean; repoUrl: string; message: string }> {
  logger.debug(`Received github:start-flow for appId: ${args.appId}`);

  try {
    const app = await db.query.apps.findFirst({
      where: eq(apps.id, args.appId),
    });

    if (!app) {
      throw new Error(`App with ID ${args.appId} not found`);
    }

    let repoUrl: string;

    if (args.existingRepoUrl) {
      // Use existing repository
      repoUrl = args.existingRepoUrl;
      logger.info(`Using existing repository: ${repoUrl}`);
    } else {
      // Create new repository
      const repo = await createRepository(
        args.repositoryName || app.name,
        args.repositoryDescription || `App created with CCDyad: ${app.name}`,
        args.isPrivate || false
      );
      repoUrl = repo.cloneUrl;
      logger.info(`Created new repository: ${repo.fullName}`);
    }

    // Push app to repository
    await pushAppToGithub(
      args.appId,
      repoUrl,
      "Initial commit from CCDyad"
    );

    // Update app with GitHub URL
    await db
      .update(apps)
      .set({ githubUrl: repoUrl })
      .where(eq(apps.id, args.appId));

    return {
      success: true,
      repoUrl,
      message: `Successfully connected app to GitHub repository: ${repoUrl}`,
    };
  } catch (error) {
    logger.error("GitHub flow failed:", error);
    return {
      success: false,
      repoUrl: "",
      message: `Failed to connect to GitHub: ${error.message}`,
    };
  }
}
```

### 2. Connection Validation

**GitHub Token Validation:**
```typescript
async function checkGithubConnection(): Promise<{
  connected: boolean;
  username?: string;
  error?: string;
}> {
  const settings = readSettings();
  
  if (!settings.githubToken) {
    return {
      connected: false,
      error: "No GitHub token configured",
    };
  }

  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${settings.githubToken}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "CCDyad-App",
      },
    });

    if (!response.ok) {
      return {
        connected: false,
        error: `GitHub API error: ${response.status} ${response.statusText}`,
      };
    }

    const user = await response.json();
    return {
      connected: true,
      username: user.login,
    };
  } catch (error) {
    return {
      connected: false,
      error: `Connection failed: ${error.message}`,
    };
  }
}
```

## Deployment Integration

### 1. Vercel Deployment Detection

**Vercel Integration Hints:**
```typescript
// While not explicitly implemented, the system is designed for Vercel compatibility:
// - Standard Vite/Next.js builds
// - Environment variable management
// - GitHub repository structure
// - Automatic deployment triggers via GitHub webhooks
```

### 2. Deployment-Ready Structure

**Generated apps include:**
- `package.json` with build scripts
- `vite.config.ts` or `next.config.js`
- `.gitignore` with proper exclusions
- Environment variable templates
- Production-ready build configurations

## Version Control Features

### 1. Automatic Git Operations

**Every AI Action Creates Commits:**
```typescript
// From response_processor.ts:
if (hasChanges) {
  // Stage all written files
  for (const file of writtenFiles) {
    await git.add({ fs, dir: appPath, filepath: file });
  }

  // Create descriptive commit message
  const changes = [];
  if (writtenFiles.length > 0) changes.push(`wrote ${writtenFiles.length} file(s)`);
  if (renamedFiles.length > 0) changes.push(`renamed ${renamedFiles.length} file(s)`);
  if (deletedFiles.length > 0) changes.push(`deleted ${deletedFiles.length} file(s)`);

  const commitMessage = chatSummary || `AI: ${changes.join(", ")}`;
  await gitCommit({ path: appPath, message: commitMessage });
}
```

### 2. Git Utilities (`/src/ipc/utils/git_utils.ts`)

**Git Commit Helper:**
```typescript
export async function gitCommit({
  path,
  message,
}: {
  path: string;
  message: string;
}): Promise<string> {
  const commitHash = await git.commit({
    fs,
    dir: path,
    author: {
      name: "CCDyad AI",
      email: "ai@dyad.sh",
    },
    message,
  });

  logger.debug(`Git commit created: ${commitHash} - ${message}`);
  return commitHash;
}
```

**Branch Management:**
```typescript
export async function createBranch(appPath: string, branchName: string): Promise<void> {
  await git.branch({
    fs,
    dir: appPath,
    ref: branchName,
  });
}

export async function switchBranch(appPath: string, branchName: string): Promise<void> {
  await git.checkout({
    fs,
    dir: appPath,
    ref: branchName,
  });
}
```

## Frontend Integration

### 1. GitHub Client (`/src/ipc/ipc_client.ts`)

**GitHub IPC Methods:**
```typescript
// GitHub repository operations
public async listGithubRepos(): Promise<GitHubRepo[]> {
  return this.ipcRenderer.invoke("github:list-repos");
}

public async createGithubRepo(params: {
  name: string;
  description: string;
  isPrivate: boolean;
}): Promise<GitHubRepo> {
  return this.ipcRenderer.invoke("github:create-repo", params);
}

public async pushAppToGithub(params: {
  appId: number;
  repoUrl: string;
  message?: string;
}): Promise<void> {
  return this.ipcRenderer.invoke("github:push-app", params);
}

public async startGithubFlow(params: {
  appId: number;
  repositoryName?: string;
  repositoryDescription?: string;
  isPrivate?: boolean;
  existingRepoUrl?: string;
}): Promise<{ success: boolean; repoUrl: string; message: string }> {
  return this.ipcRenderer.invoke("github:start-flow", params);
}

public async checkGithubConnection(): Promise<{
  connected: boolean;
  username?: string;
  error?: string;
}> {
  return this.ipcRenderer.invoke("github:check-connection");
}
```

### 2. GitHub Components

**Repository Selection UI:**
```tsx
// Hypothetical GitHub repository selector component
const GitHubRepoSelector = ({ appId }: { appId: number }) => {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRepos = async () => {
      try {
        const ipcClient = IpcClient.getInstance();
        const repoList = await ipcClient.listGithubRepos();
        setRepos(repoList);
      } catch (error) {
        showError(`Failed to load repositories: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadRepos();
  }, []);

  const handleConnect = async (repoUrl: string) => {
    try {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.startGithubFlow({
        appId,
        existingRepoUrl: repoUrl,
      });

      if (result.success) {
        showSuccess(result.message);
      } else {
        showError(result.message);
      }
    } catch (error) {
      showError(`Failed to connect repository: ${error.message}`);
    }
  };

  return (
    <div className="space-y-4">
      {repos.map(repo => (
        <div key={repo.id} className="flex items-center justify-between p-4 border rounded">
          <div>
            <h3 className="font-medium">{repo.fullName}</h3>
            <p className="text-sm text-muted-foreground">{repo.description}</p>
          </div>
          <button
            onClick={() => handleConnect(repo.cloneUrl)}
            className="btn-primary"
          >
            Connect
          </button>
        </div>
      ))}
    </div>
  );
};
```

## Authentication & Security

### 1. GitHub Token Management

**Token Storage:**
```typescript
// Stored in user settings
interface UserSettings {
  githubToken?: string;
  // ... other settings
}

// Token usage in API calls
const response = await fetch("https://api.github.com/user/repos", {
  headers: {
    "Authorization": `Bearer ${settings.githubToken}`,
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "CCDyad-App",
  },
});
```

### 2. Permission Scopes

**Required GitHub Permissions:**
- `repo` - Full repository access
- `user` - Read user profile information
- `workflow` - GitHub Actions (if used)

**Token Validation:**
- Token validity checked on connection
- User information fetched to verify access
- Error handling for expired/invalid tokens

## Workflow Automation

### 1. Deployment Workflows

**GitHub Actions Integration:**
```yaml
# .github/workflows/deploy.yml (generated for apps)
name: Deploy to Vercel
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### 2. Automated Deployment

**Vercel Integration Flow:**
1. App pushed to GitHub repository
2. GitHub webhook triggers Vercel build
3. Vercel deploys app automatically
4. Deployment URL available in Vercel dashboard

## Error Handling

### 1. GitHub API Errors

**Error Response Handling:**
```typescript
if (!response.ok) {
  const errorData = await response.json();
  throw new Error(`GitHub API error: ${response.status} - ${errorData.message}`);
}
```

**Common Error Cases:**
- **401 Unauthorized**: Invalid or expired token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Repository doesn't exist
- **422 Unprocessable Entity**: Validation errors (e.g., repo name exists)

### 2. Git Operation Errors

**Push Failures:**
```typescript
try {
  await git.push({ /*...*/ });
} catch (error) {
  if (error.message.includes("rejected")) {
    throw new Error("Push rejected - repository may have newer commits");
  } else if (error.message.includes("authentication")) {
    throw new Error("Authentication failed - check GitHub token");
  } else {
    throw new Error(`Git push failed: ${error.message}`);
  }
}
```

## Integration Benefits

### 1. Seamless Development Workflow

- **Automatic Version Control**: Every AI change creates commits
- **Branch Management**: Support for feature branches and merging
- **Collaboration**: Multiple developers can work on CCDyad-generated apps
- **Deployment**: Direct integration with hosting platforms

### 2. Professional Development Practices

- **Git History**: Complete audit trail of all changes
- **Repository Management**: Professional README, .gitignore, etc.
- **CI/CD Ready**: GitHub Actions workflows for automated deployment
- **Open Source Friendly**: Public repositories supported

## Related Files

- **GitHub Handlers**: `/src/ipc/handlers/github_handlers.ts`
- **Git Utilities**: `/src/ipc/utils/git_utils.ts`
- **IPC Client**: `/src/ipc/ipc_client.ts`
- **Response Processor**: `/src/ipc/processors/response_processor.ts`
- **Settings Management**: `/src/main/settings.ts`