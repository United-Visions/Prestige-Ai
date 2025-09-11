const { fs, path, app } = window.electronAPI;
import { DEFAULT_TEMPLATE_ID, getTemplateOrThrow } from "./index";
import { copyDirectoryRecursive } from "../utils/file_utils";

// Simple Git clone implementation using fetch API
interface GitHubApiContent {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url?: string;
  url: string;
}

interface CloneProgress {
  step: string;
  progress: number;
  total: number;
}

export interface CreateFromTemplateOptions {
  fullAppPath: string;
  templateId?: string;
}

export async function createFromTemplate({
  fullAppPath,
  templateId = DEFAULT_TEMPLATE_ID,
}: CreateFromTemplateOptions) {
  if (templateId === "vite-react") {
    // Use direct scaffold copying like CCdyad does
    // Handle both development and production paths
    let scaffoldPath: string;
    
    const { resourcesPath, appPath: electronAppPath, isPackaged } = await window.electronAPI.app.getPaths();

    // Check if we're in production (when resourcesPath is available) or development
    if (isPackaged) {
      // Production: scaffold is in Resources folder
      scaffoldPath = await path.join(resourcesPath, "scaffold");
    } else {
      // Development: scaffold is in the project root
      scaffoldPath = await path.join(electronAppPath, "scaffold");
    }
    
    // Copy scaffold files to the 'files' subdirectory where viewer expects them
    const filesPath = await path.join(fullAppPath, "files");
    await copyDirectoryRecursive(scaffoldPath, filesPath);
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

export async function initializeAppStructure(appPath: string, templateId: string = DEFAULT_TEMPLATE_ID) {
  // Create the app from template
  await createFromTemplate({ fullAppPath: appPath, templateId });
  
  // Work with files in the 'files' subdirectory where viewer expects them
  const filesPath = await path.join(appPath, "files");
  
  // Ensure AI_RULES.md exists
  const aiRulesPath = await path.join(filesPath, "AI_RULES.md");
  try {
    await fs.readFile(aiRulesPath);
    // File exists, no need to create it
  } catch {
    // File doesn't exist, create it
    await createDefaultAiRules(aiRulesPath, templateId);
  }
  
  // Ensure package.json has the right dev script
  await ensureDevScript(filesPath, templateId);
  
  // Ensure PostCSS config is ES module compatible
  await ensurePostCSSConfig(filesPath);
  
  console.log(`Initialized app structure at ${appPath} with template ${templateId}`);
}

async function createDefaultAiRules(aiRulesPath: string, templateId: string) {
  let aiRules = "";
  
  switch (templateId) {
    case "vite-react":
      aiRules = `# Tech Stack
- You are building a React application with Vite
- Use TypeScript for all code
- Use React Router for navigation (keep routes in src/App.tsx)
- Always put source code in the src folder
- Put pages into src/pages/
- Put components into src/components/
- The main page (default page) is src/pages/Index.tsx
- UPDATE the main page to include new components. OTHERWISE, the user can NOT see any components!
- ALWAYS try to use shadcn/ui library components
- Tailwind CSS: always use Tailwind CSS for styling components

Available packages and libraries:
- The lucide-react package is installed for icons
- You ALREADY have ALL the shadcn/ui components and their dependencies installed
- You have ALL the necessary Radix UI components installed
- Use prebuilt components from the shadcn/ui library after importing them`;
      break;
      
    case "next":
      aiRules = `# Tech Stack
- You are building a Next.js application
- Use TypeScript for all code
- Use Next.js App Router (app directory)
- Always put source code in the app folder
- Put pages into app/
- Put components into components/
- The main page is app/page.tsx
- UPDATE the main page to include new components. OTHERWISE, the user can NOT see any components!
- ALWAYS try to use shadcn/ui library components
- Tailwind CSS: always use Tailwind CSS for styling components

Available packages and libraries:
- The lucide-react package is installed for icons
- You ALREADY have ALL the shadcn/ui components and their dependencies installed
- You have ALL the necessary Radix UI components installed`;
      break;
      
    default:
      aiRules = `# Tech Stack
- You are building a web application
- Use TypeScript for all code
- Always put source code in the src folder
- ALWAYS try to use modern UI components
- Tailwind CSS: always use Tailwind CSS for styling components`;
  }
  
  await fs.writeFile(aiRulesPath, aiRules);
}

async function ensureDevScript(appPath: string, templateId: string) {
  const packageJsonPath = await path.join(appPath, "package.json");
  
  try {
    // Try to read existing package.json
    const packageJsonContent = await fs.readFile(packageJsonPath);
    const packageJson = JSON.parse(packageJsonContent);
    
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    
    // Ensure the dev script uses the right port
    switch (templateId) {
      case "vite-react":
      case "vue":
      case "astro":
        packageJson.scripts.dev = "vite --port 32100 --host";
        break;
      case "next":
        packageJson.scripts.dev = "next dev -p 32100";
        break;
      default:
        packageJson.scripts.dev = "vite --port 32100 --host";
    }
    
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  } catch (error) {
    console.warn(`Failed to update package.json at ${packageJsonPath}:`, error);
  }
}


async function cloneRepo(repoUrl: string, onProgress?: (progress: CloneProgress) => void): Promise<string> {
  const url = new URL(repoUrl);
  if (url.protocol !== "https:") {
    throw new Error("Repository URL must use HTTPS.");
  }
  if (url.hostname !== "github.com") {
    throw new Error("Repository URL must be a github.com URL.");
  }

  const pathParts = url.pathname.split("/").filter((part) => part.length > 0);
  if (pathParts.length !== 2) {
    throw new Error(
      "Invalid repository URL format. Expected 'https://github.com/org/repo'"
    );
  }

  const orgName = pathParts[0];
  const repoBasename = await path.basename(pathParts[1], ".git");

  if (!orgName || !repoBasename) {
    throw new Error(
      "Failed to parse organization or repository name from URL."
    );
  }

  console.log(`Cloning repository: ${orgName}/${repoBasename}`);
  onProgress?.({ step: "Initializing", progress: 0, total: 100 });

  const appDataPath = await app.getAppDataPath();
  const cachePath = await path.join(
    appDataPath,
    "templates-cache",
    orgName,
    repoBasename
  );

  // Check if we should update cached repository
  const shouldUpdate = await shouldUpdateCachedRepo(cachePath, orgName, repoBasename);
  
  if (await fs.pathExists(cachePath) && !shouldUpdate) {
    console.info(`Using cached template at ${cachePath}`);
    onProgress?.({ step: "Using cached version", progress: 100, total: 100 });
    return cachePath;
  }

  // Remove existing cache if updating
  if (shouldUpdate) {
    console.log("Updating cached repository...");
    await fs.remove(cachePath);
  }

  onProgress?.({ step: "Fetching repository contents", progress: 10, total: 100 });

  // Download repository using GitHub API
  await downloadGitHubRepo(orgName, repoBasename, cachePath, onProgress);
  
  onProgress?.({ step: "Repository cloned successfully", progress: 100, total: 100 });
  console.info(`Repository cloned to ${cachePath}`);
  return cachePath;
}

async function shouldUpdateCachedRepo(cachePath: string, orgName: string, repoName: string): Promise<boolean> {
  try {
    // Check if cache exists
    if (!(await fs.pathExists(cachePath))) {
      return false; // No cache, need to download
    }

    // Check if cache is older than 1 hour
    const metaPath = await path.join(cachePath, '.prestige-cache-meta.json');
    if (await fs.pathExists(metaPath)) {
      const metaContent = await fs.readFile(metaPath);
      const meta = JSON.parse(metaContent);
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      if (meta.timestamp > oneHourAgo) {
        return false; // Cache is fresh
      }
    }

    // Check if remote has updates by comparing with GitHub API
    const apiUrl = `https://api.github.com/repos/${orgName}/${repoName}/commits/HEAD`;
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Prestige-AI'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const remoteSha = data.sha;
        
        // Compare with cached SHA
        const metaPath = await path.join(cachePath, '.prestige-cache-meta.json');
        if (await fs.pathExists(metaPath)) {
          const metaContent = await fs.readFile(metaPath);
          const meta = JSON.parse(metaContent);
          
          if (meta.sha === remoteSha) {
            // Update timestamp but keep cache
            meta.timestamp = Date.now();
            await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
            return false;
          }
        }
        
        return true; // Different SHA, need to update
      }
    } catch (error) {
      console.warn('Failed to check for remote updates:', error);
    }
    
    return false; // Default to using cache
  } catch (error) {
    console.warn('Error checking cache status:', error);
    return true; // When in doubt, update
  }
}

async function downloadGitHubRepo(orgName: string, repoName: string, targetPath: string, onProgress?: (progress: CloneProgress) => void): Promise<void> {
  const apiUrl = `https://api.github.com/repos/${orgName}/${repoName}/contents`;
  
  // Ensure target directory exists
  await fs.ensureDir(targetPath);
  
  // Get latest commit SHA for caching
  let latestSha: string | undefined;
  try {
    const commitsResponse = await fetch(`https://api.github.com/repos/${orgName}/${repoName}/commits/HEAD`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Prestige-AI'
      }
    });
    
    if (commitsResponse.ok) {
      const commitData = await commitsResponse.json();
      latestSha = commitData.sha;
    }
  } catch (error) {
    console.warn('Failed to get latest commit SHA:', error);
  }
  
  onProgress?.({ step: "Downloading files", progress: 20, total: 100 });
  
  // Download all files recursively
  await downloadDirectory(apiUrl, targetPath, onProgress, 20, 80);
  
  // Create cache metadata
  const metaPath = await path.join(targetPath, '.prestige-cache-meta.json');
  const metadata = {
    orgName,
    repoName,
    timestamp: Date.now(),
    sha: latestSha,
  };
  await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));
  
  onProgress?.({ step: "Processing completed", progress: 90, total: 100 });
}

async function downloadDirectory(apiUrl: string, targetPath: string, onProgress?: (progress: CloneProgress) => void, startProgress: number = 0, endProgress: number = 100): Promise<void> {
  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Prestige-AI'
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
    }
    
    const contents: GitHubApiContent[] = await response.json();
    
    // Filter out unwanted files and directories
    const filteredContents = contents.filter(item => {
      const excludedDirs = ['.git', 'node_modules', '.DS_Store', '.gitignore'];
      const excludedFiles = ['.gitignore', '.DS_Store'];
      
      if (item.type === 'dir' && excludedDirs.includes(item.name)) {
        return false;
      }
      if (item.type === 'file' && excludedFiles.includes(item.name)) {
        return false;
      }
      
      return true;
    });
    
    const totalItems = filteredContents.length;
    let completedItems = 0;
    
    for (const item of filteredContents) {
      const itemPath = await path.join(targetPath, item.name);
      
      if (item.type === 'file' && item.download_url) {
        // Download file
        const fileResponse = await fetch(item.download_url);
        if (fileResponse.ok) {
          const content = await fileResponse.text();
          await fs.writeFile(itemPath, content);
        }
      } else if (item.type === 'dir') {
        // Create directory and download recursively
        await fs.ensureDir(itemPath);
        await downloadDirectory(item.url, itemPath);
      }
      
      completedItems++;
      const progress = startProgress + ((completedItems / totalItems) * (endProgress - startProgress));
      onProgress?.({ step: `Processing ${item.name}`, progress, total: 100 });
    }
  } catch (error) {
    console.error('Failed to download directory:', error);
    throw error;
  }
}

async function ensurePostCSSConfig(appPath: string) {
  const postcssConfigPath = await path.join(appPath, "postcss.config.js");
  
  const correctPostCSSConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;

  try {
    // Check if file exists and read its content
    const existingConfig = await fs.readFile(postcssConfigPath);
    
    // Check if it contains CommonJS syntax
    if (existingConfig.includes('module.exports') || existingConfig.includes('require(')) {
      console.log('Updating PostCSS config from CommonJS to ES modules');
      await fs.writeFile(postcssConfigPath, correctPostCSSConfig);
    }
  } catch (error) {
    // File doesn't exist or can't be read, create it
    console.log('Creating PostCSS config file');
    await fs.writeFile(postcssConfigPath, correctPostCSSConfig);
  }
}

async function copyRepoToApp(repoCachePath: string, appPath: string) {
  console.log(`Copying repository from ${repoCachePath} to ${appPath}`);
  
  try {
    // Copy files to the 'files' subdirectory where viewer expects them
    const filesPath = await path.join(appPath, "files");
    
    // Ensure the target directory exists
    await fs.ensureDir(filesPath);
    
    // Copy all files except cache metadata
    await copyDirectoryRecursive(repoCachePath, filesPath, {
      filter: (src: string) => {
        const basename = path.basename ? path.basename(src) : src.split('/').pop() || '';
        return basename !== '.prestige-cache-meta.json';
      }
    });
    
    console.log('Repository contents copied successfully');
  } catch (error) {
    console.error('Error copying repository:', error);
    throw new Error(`Failed to copy repository contents: ${error.message}`);
  }
}
