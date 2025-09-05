import { getTemplateOrThrow, DEFAULT_TEMPLATE_ID } from '../templates';
import { copyDirectoryRecursive } from '../utils/file_utils';
const { path } = window.electronAPI;
export class TemplateService {
    constructor() { }
    static getInstance() {
        if (!TemplateService.instance) {
            TemplateService.instance = new TemplateService();
        }
        return TemplateService.instance;
    }
    async createFromTemplate(params) {
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
    async createFromLocalScaffold(appPath) {
        const { resourcesPath, appPath: electronAppPath, isPackaged } = await window.electronAPI.app.getPaths();
        const scaffoldPath = isPackaged
            ? await path.join(resourcesPath, "scaffold")
            : await path.join(electronAppPath, "scaffold");
        const filesPath = await path.join(appPath, "files");
        await copyDirectoryRecursive(scaffoldPath, filesPath);
    }
    async createFromGitHubTemplate(appPath, githubUrl) {
        // In a real implementation, this would clone the GitHub repository
        // For now, fallback to the local scaffold
        console.log(`Would clone ${githubUrl} to ${appPath}`);
        await this.createFromLocalScaffold(appPath);
    }
}
