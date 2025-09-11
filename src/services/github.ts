// Browser-compatible GitHub service (simulation)
import { Template } from '../templates';

export interface GitHubTemplate extends Template {
  repoUrl: string;
  branch?: string;
  path?: string;
  stars: number;
  lastUpdated: Date;
  author: string;
  license?: string;
}

export interface GitHubRepo {
  owner: string;
  repo: string;
  branch?: string;
  path?: string;
}

export class GitHubService {
  constructor(_token?: string) {
    console.log('GitHubService initialized for browser environment');
  }

  async fetchTemplate(repoInfo: GitHubRepo): Promise<GitHubTemplate | null> {
    // Browser simulation - in real implementation this would use fetch API
    const { owner, repo } = repoInfo;
    
    // Simulate GitHub API response
    const template: GitHubTemplate = {
      id: `github-${owner}-${repo}`,
      title: repo,
      description: `Template from ${owner}/${repo}`,
      imageUrl: '',
      isOfficial: false,
      icon: '📦',
      repoUrl: `https://github.com/${owner}/${repo}`,
      branch: 'main',
      path: '',
      stars: Math.floor(Math.random() * 1000),
      lastUpdated: new Date(),
      author: owner,
      license: 'MIT'
    };

    return template;
  }

  async searchTemplates(query: string): Promise<GitHubTemplate[]> {
    console.log(`Searching GitHub for: ${query}`);
    
    // Simulate search results
    const mockTemplates: GitHubTemplate[] = [
      {
        id: 'github-vercel-next',
        title: 'Next.js Template',
        description: 'The official Next.js template',
        imageUrl: '',
        isOfficial: false,
        icon: '▲',
        repoUrl: 'https://github.com/vercel/next.js',
        stars: 100000,
        lastUpdated: new Date(),
        author: 'vercel',
        license: 'MIT'
      },
      {
        id: 'github-vitejs-vite',
        title: 'Vite Template',
        description: 'Fast build tool template',
        imageUrl: '',
        isOfficial: false,
        icon: '⚡',
        repoUrl: 'https://github.com/vitejs/vite',
        stars: 50000,
        lastUpdated: new Date(),
        author: 'vitejs',
        license: 'MIT'
      }
    ];

    return mockTemplates;
  }

  async downloadTemplate(template: GitHubTemplate, _targetPath: string): Promise<void> {
    console.log(`Simulating download of template: ${template.title}`);
    // In a real implementation, this would clone the repository
    throw new Error('Template downloading not implemented in browser environment');
  }

}

export const githubService = new GitHubService();