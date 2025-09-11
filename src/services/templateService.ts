import { getTemplateOrThrow, DEFAULT_TEMPLATE_ID } from '../templates';
import { copyDirectoryRecursive } from '../utils/file_utils';

const { path } = window.electronAPI;

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
      await this.createFromLocalScaffold(params.appPath);
      return;
    }

    const template = getTemplateOrThrow(templateId);
    if (!template.githubUrl) {
      console.warn(`Template ${templateId} has no GitHub URL, using local scaffold`);
      await this.createFromLocalScaffold(params.appPath);
      return;
    }
    
    await this.createFromGitHubTemplate(params.appPath, template.githubUrl);
  }

  private async createFromLocalScaffold(appPath: string): Promise<void> {
    const { resourcesPath, appPath: electronAppPath, isPackaged } = await window.electronAPI.app.getPaths();

    const scaffoldPath = isPackaged
      ? await path.join(resourcesPath, "scaffold")
      : await path.join(electronAppPath, "scaffold");
    
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
