const { fs, path, app } = window.electronAPI;
import { DEFAULT_TEMPLATE_ID, getTemplateOrThrow } from "./index";
import { copyDirectoryRecursive } from "../utils/file_utils";

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
    
    // Check if we're in production (when resourcesPath is available) or development
    if (typeof process !== 'undefined' && process.resourcesPath) {
      // Production: scaffold is in Resources folder
      scaffoldPath = await path.join(process.resourcesPath, "scaffold");
    } else {
      // Development: scaffold is in the same directory as the app
      const appCwd = await app.getCwd();
      scaffoldPath = await path.join(appCwd, "scaffold");
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


async function cloneRepo(repoUrl: string): Promise<string> {
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

  const cwd = await app.getCwd();
  const cachePath = await path.join(
    cwd,
    "templates-cache",
    orgName,
    repoBasename
  );

  if (await fs.pathExists(cachePath)) {
    console.info(`Using cached template at ${cachePath}`);
    return cachePath;
  }

  // For now, we'll use a simple download approach
  // In a real implementation, you'd use isomorphic-git or similar
  throw new Error("GitHub template cloning not yet implemented. Use local templates.");
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

async function copyRepoToApp(_repoCachePath: string, _appPath: string) {
  // GitHub template cloning is not implemented yet
  // This function is a placeholder for when GitHub templates are supported
  console.warn("GitHub template cloning not implemented yet");
  throw new Error("GitHub template cloning not yet implemented. Use local templates.");
}
