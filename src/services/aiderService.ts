// Minimal message interface (compatible with existing services expectation)
interface CoreMessage { role: string; content: string; }

interface ProcessedResponse {
  raw: string;
}

export class AiderService {
  private static instance: AiderService;
  private availabilityChecked = false;
  private available = false;

  static getInstance(): AiderService {
    if (!AiderService.instance) AiderService.instance = new AiderService();
    return AiderService.instance;
  }

  async checkAvailability(): Promise<boolean> {
    if (this.availabilityChecked) return this.available;
    this.availabilityChecked = true;
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.aider) {
        this.available = await (window as any).electronAPI.aider.checkAvailability();
      }
    } catch (e) {
      console.warn('Aider CLI availability check failed', e);
      this.available = false;
    }
    return this.available;
  }

  async sendConversation(messages: CoreMessage[], options: { cwd?: string; model?: string; apiKeySpec?: string } = {}): Promise<ProcessedResponse> {
    if (!(await this.checkAvailability())) throw new Error('Aider CLI not available');
    const prompt = this.formatMessages(messages);
    const raw = await (window as any).electronAPI.aider.execute(prompt, options);
    return { raw };
  }

  async runPrompt(prompt: string, options: { cwd?: string; model?: string; apiKeySpec?: string } = {}): Promise<ProcessedResponse> {
    if (!(await this.checkAvailability())) throw new Error('Aider CLI not available');
    const raw = await (window as any).electronAPI.aider.execute(prompt, options);
    return { raw };
  }

  private formatMessages(messages: CoreMessage[]): string {
    return messages.map(m => `${m.role.toUpperCase()}:\n${(m as any).content || ''}`).join('\n\n');
  }
}
