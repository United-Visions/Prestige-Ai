# File Processing System

## Overview
CCDyad processes AI responses through a sophisticated tag-based system that converts AI instructions into file operations, dependency management, and service integrations.

## Response Processing Flow

### 1. Main Processor (`/src/ipc/processors/response_processor.ts`)

**Processing Entry Point:**
```typescript
export async function processFullResponseActions(
  fullResponse: string,
  chatId: number,
  { chatSummary, messageId }: { chatSummary: string | undefined; messageId: number },
): Promise<{
  updatedFiles?: boolean;
  error?: string; 
  extraFiles?: string[];
  extraFilesError?: string;
}> {
  // Get app context
  const chatWithApp = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
    with: { app: true },
  });

  const appPath = getDyadAppPath(chatWithApp.app.path);
  const writtenFiles: string[] = [];
  const renamedFiles: string[] = [];
  const deletedFiles: string[] = [];

  // Extract all dyad tags
  const dyadWriteTags = getDyadWriteTags(fullResponse);
  const dyadRenameTags = getDyadRenameTags(fullResponse);
  const dyadDeletePaths = getDyadDeleteTags(fullResponse);
  const dyadAddDependencyPackages = getDyadAddDependencyTags(fullResponse);
  const dyadExecuteSqlQueries = getDyadExecuteSqlTags(fullResponse);
}
```

### 2. Tag Parsing (`/src/ipc/utils/dyad_tag_parser.ts`)

**Write Tag Extraction:**
```typescript
export function getDyadWriteTags(content: string): DyadWriteTag[] {
  const regex = /<dyad-write\s+path="([^"]+)"(?:\s+description="([^"]*)")?\s*>([\s\S]*?)<\/dyad-write>/g;
  const tags: DyadWriteTag[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    tags.push({
      path: match[1],
      description: match[2] || '',
      content: match[3],
    });
  }

  return tags;
}
```

**Other Tag Parsers:**
```typescript
export function getDyadRenameTags(content: string): DyadRenameTag[] {
  const regex = /<dyad-rename\s+from="([^"]+)"\s+to="([^"]+)"\s*(?:\/)?>/g;
  // Returns: [{ from: string, to: string }]
}

export function getDyadDeleteTags(content: string): string[] {
  const regex = /<dyad-delete\s+path="([^"]+)"\s*(?:\/)?>/g;
  // Returns: string[] of paths to delete
}

export function getDyadAddDependencyTags(content: string): string[] {
  const regex = /<dyad-add-dependency\s+packages="([^"]+)"\s*(?:\/)?>/g;
  // Returns: string[] of package names
}

export function getDyadExecuteSqlTags(content: string): DyadExecuteSqlTag[] {
  const regex = /<dyad-execute-sql(?:\s+description="([^"]*)")?\s*>([\s\S]*?)<\/dyad-execute-sql>/g;
  // Returns: [{ description: string, content: string }]
}
```

## File Operations

### 1. Operation Order

**Critical Processing Sequence:**
```typescript
// Process operations in specific order to avoid conflicts:
// 1. Deletes
// 2. Renames  
// 3. Writes

// Why this order?
// - Deleting first avoids path conflicts
// - LLMs often rename then edit the same file
// - Writes come last to ensure clean state
```

### 2. File Deletion

```typescript
// Process all file deletions
for (const filePath of dyadDeletePaths) {
  const fullFilePath = safeJoin(appPath, filePath);

  if (fs.existsSync(fullFilePath)) {
    if (fs.lstatSync(fullFilePath).isDirectory()) {
      fs.rmdirSync(fullFilePath, { recursive: true });
    } else {
      fs.unlinkSync(fullFilePath);
    }
    
    deletedFiles.push(filePath);

    // Remove from git
    try {
      await git.remove({ fs, dir: appPath, filepath: filePath });
    } catch (error) {
      logger.warn(`Failed to git remove ${filePath}:`, error);
    }
  }
}
```

### 3. File Renaming

```typescript
// Process all file renames
for (const tag of dyadRenameTags) {
  const fromPath = safeJoin(appPath, tag.from);
  const toPath = safeJoin(appPath, tag.to);

  if (fs.existsSync(fromPath)) {
    // Ensure destination directory exists
    const toDir = path.dirname(toPath);
    fs.mkdirSync(toDir, { recursive: true });

    // Rename the file
    fs.renameSync(fromPath, toPath);
    renamedFiles.push(`${tag.from} → ${tag.to}`);

    // Update git
    await git.add({ fs, dir: appPath, filepath: tag.to });
    await git.remove({ fs, dir: appPath, filepath: tag.from });

    // Handle Supabase functions
    if (isServerFunction(tag.from)) {
      await deleteSupabaseFunction({
        supabaseProjectId: chatWithApp.app.supabaseProjectId!,
        functionName: getFunctionNameFromPath(tag.from),
      });
    }
    
    if (isServerFunction(tag.to)) {
      await deploySupabaseFunctions({
        supabaseProjectId: chatWithApp.app.supabaseProjectId!,
        functionName: getFunctionNameFromPath(tag.to),
        content: await readFileFromFunctionPath(toPath),
      });
    }
  }
}
```

### 4. File Writing

```typescript
// Process all file writes
for (const tag of dyadWriteTags) {
  const filePath = tag.path;
  const content = tag.content;
  const fullFilePath = safeJoin(appPath, filePath);

  // Ensure directory exists
  const dirPath = path.dirname(fullFilePath);
  fs.mkdirSync(dirPath, { recursive: true });

  // Write file content
  fs.writeFileSync(fullFilePath, content);
  writtenFiles.push(filePath);

  // Deploy Supabase functions automatically
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
}
```

## Dependency Management

### 1. Package Installation (`/src/ipc/processors/executeAddDependency.ts`)

```typescript
export async function executeAddDependency({
  packages,
  message,
  appPath,
}: {
  packages: string[];
  message: Message;
  appPath: string;
}) {
  const packageJsonPath = path.join(appPath, "package.json");
  
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error("package.json not found");
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  // Add packages to dependencies
  for (const pkg of packages) {
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }
    
    // Get latest version from npm registry
    const version = await getLatestPackageVersion(pkg);
    packageJson.dependencies[pkg] = version;
  }

  // Write updated package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Install packages
  const installCommand = fs.existsSync(path.join(appPath, "pnpm-lock.yaml"))
    ? "pnpm install"
    : "npm install --legacy-peer-deps";

  await executeCommand(installCommand, { cwd: appPath });
}
```

### 2. Version Resolution

```typescript
async function getLatestPackageVersion(packageName: string): Promise<string> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
    const data = await response.json();
    return `^${data.version}`;
  } catch (error) {
    logger.warn(`Failed to get version for ${packageName}, using 'latest'`);
    return "latest";
  }
}
```

## SQL Execution

### 1. Database Operations

```typescript
// Handle SQL execution tags
if (dyadExecuteSqlQueries.length > 0) {
  for (const query of dyadExecuteSqlQueries) {
    try {
      await executeSupabaseSql({
        supabaseProjectId: chatWithApp.app.supabaseProjectId!,
        query: query.content,
      });

      // Write migration file if enabled
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
    } catch (error) {
      errors.push({
        message: `Failed to execute SQL query: ${query.content}`,
        error: error,
      });
    }
  }
}
```

### 2. Migration File Generation

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
}
```

## Git Integration

### 1. Automatic Commits

```typescript
// If we have any file changes, commit them all at once
hasChanges = writtenFiles.length > 0 || 
             renamedFiles.length > 0 || 
             deletedFiles.length > 0 ||
             dyadAddDependencyPackages.length > 0 ||
             writtenSqlMigrationFiles > 0;

if (hasChanges) {
  // Stage all written files
  for (const file of writtenFiles) {
    await git.add({ fs, dir: appPath, filepath: file });
  }

  // Create commit with details of all changes
  const changes = [];
  if (writtenFiles.length > 0) changes.push(`wrote ${writtenFiles.length} file(s)`);
  if (renamedFiles.length > 0) changes.push(`renamed ${renamedFiles.length} file(s)`);
  if (deletedFiles.length > 0) changes.push(`deleted ${deletedFiles.length} file(s)`);
  if (dyadAddDependencyPackages.length > 0) changes.push(`added dependencies: ${dyadAddDependencyPackages.join(", ")}`);

  const commitMessage = chatSummary || `AI: ${changes.join(", ")}`;
  
  await gitCommit({ path: appPath, message: commitMessage });
}
```

### 2. Commit Message Generation

**Automatic Summary:**
- **Chat Summary**: Uses AI-generated summary if available
- **Fallback**: Descriptive list of changes made
- **Format**: `AI: wrote 3 file(s), added dependencies: react-router-dom`

## Supabase Function Deployment

### 1. Automatic Detection

```typescript
function isServerFunction(filePath: string): boolean {
  return filePath.startsWith("supabase/functions/");
}

function getFunctionNameFromPath(input: string): string {
  return path.basename(path.extname(input) ? path.dirname(input) : input);
}
```

### 2. Auto-Deployment

```typescript
// Deploy Supabase functions automatically when written
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

## Error Handling

### 1. Operation Tracking

```typescript
const warnings: Output[] = [];
const errors: Output[] = [];

interface Output {
  message: string;
  error: unknown;
}

// Collect errors without stopping processing
try {
  await someOperation();
} catch (error) {
  errors.push({
    message: `Failed to perform operation: ${details}`,
    error: error,
  });
}
```

### 2. Rollback Strategy

```typescript
// If critical errors occur, attempt cleanup
if (errors.length > 0) {
  logger.error("Errors occurred during processing:", errors);
  
  // Attempt to revert changes if possible
  try {
    await git.reset({ fs, dir: appPath, ref: "HEAD", hard: true });
  } catch (rollbackError) {
    logger.error("Failed to rollback changes:", rollbackError);
  }
}
```

## Path Safety

### 1. Secure Path Joining

```typescript
export function safeJoin(basePath: string, relativePath: string): string {
  const resolvedPath = path.resolve(basePath, relativePath);
  
  // Ensure the resolved path is within the base path
  if (!resolvedPath.startsWith(path.resolve(basePath))) {
    throw new Error(`Path traversal detected: ${relativePath}`);
  }
  
  return resolvedPath;
}
```

### 2. File System Security

- **Path Validation**: All paths checked for traversal attacks
- **Base Path Restriction**: Files only written within app directory
- **Extension Validation**: Only allowed file types processed
- **Size Limits**: Large files rejected to prevent abuse

## Performance Optimizations

### 1. Batch Operations

- **Single Git Commit**: All changes committed together
- **Parallel Processing**: Independent operations run concurrently
- **Lazy Loading**: Files only read when needed
- **Caching**: Package versions and git operations cached

### 2. Memory Management

- **Stream Processing**: Large files handled as streams
- **Buffer Limits**: Content size restrictions enforced
- **Cleanup**: Temporary files and processes cleaned up
- **Resource Pooling**: Database connections reused

## Related Files

- **Main Processor**: `/src/ipc/processors/response_processor.ts`
- **Tag Parser**: `/src/ipc/utils/dyad_tag_parser.ts`
- **Dependency Handler**: `/src/ipc/processors/executeAddDependency.ts`
- **Git Utilities**: `/src/ipc/utils/git_utils.ts`
- **File Utilities**: `/src/ipc/utils/file_utils.ts`
- **Path Safety**: `/src/ipc/utils/path_utils.ts`
- **Supabase Integration**: `/src/supabase_admin/supabase_management_client.ts`