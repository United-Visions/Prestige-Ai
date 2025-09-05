export class GitHubService {
    constructor(_token) {
        console.log('GitHubService initialized for browser environment');
    }
    async fetchTemplate(repoInfo) {
        // Browser simulation - in real implementation this would use fetch API
        const { owner, repo } = repoInfo;
        // Simulate GitHub API response
        const template = {
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
    async searchTemplates(query) {
        console.log(`Searching GitHub for: ${query}`);
        // Simulate search results
        const mockTemplates = [
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
    async downloadTemplate(template, _targetPath) {
        console.log(`Simulating download of template: ${template.title}`);
        // In a real implementation, this would clone the repository
        throw new Error('Template downloading not implemented in browser environment');
    }
}
export const githubService = new GitHubService();
