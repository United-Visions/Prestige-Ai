import { getTemplateOrThrow, DEFAULT_TEMPLATE_ID } from '@/templates';
import { copyDirectoryRecursive } from '../utils/file_utils';

const { path, app } = window.electronAPI;

export interface CreateFromTemplateParams {
  appPath: string;
  templateId?: string;
}

export class TemplateService {
  private static instance: TemplateService;

  private constructor() {}

  public static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  async createFromTemplate(params: CreateFromTemplateParams): Promise<void> {
    const templateId = params.templateId ?? DEFAULT_TEMPLATE_ID;
    
    if (templateId === "vite-react") {
      // Use local scaffold directory for the default React template
      await this.createFromLocalScaffold(params.appPath);
      return;
    }

    // Use GitHub template
    const template = getTemplateOrThrow(templateId);
    if (!template.githubUrl) {
      // Fallback to local scaffold if no GitHub URL
      console.warn(`Template ${templateId} has no GitHub URL, using local scaffold`);
      await this.createFromLocalScaffold(params.appPath);
      return;
    }
    
    await this.createFromGitHubTemplate(params.appPath, template.githubUrl);
  }

  private async createFromLocalScaffold(appPath: string): Promise<void> {
    // Use direct scaffold copying like CCdyad does
    // Get the app directory and build path to scaffold
    const appCwd = await app.getCwd();
    const scaffoldPath = await path.join(appCwd, "scaffold");
    
    // Copy scaffold files to the 'files' subdirectory where viewer expects them
    const filesPath = await path.join(appPath, "files");
    await copyDirectoryRecursive(scaffoldPath, filesPath);
  }

  private async createFromGitHubTemplate(appPath: string, githubUrl: string): Promise<void> {
    // In a real implementation, this would clone the GitHub repository
    // For now, fallback to the local scaffold
    console.log(`Would clone ${githubUrl} to ${appPath}`);
    await this.createFromLocalScaffold(appPath);
  }

}