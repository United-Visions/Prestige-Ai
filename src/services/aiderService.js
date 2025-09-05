export class AiderService {
    constructor() {
        Object.defineProperty(this, "availabilityChecked", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "available", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
    }
    static getInstance() {
        if (!AiderService.instance)
            AiderService.instance = new AiderService();
        return AiderService.instance;
    }
    async checkAvailability() {
        if (this.availabilityChecked)
            return this.available;
        this.availabilityChecked = true;
        try {
            if (typeof window !== 'undefined' && window.electronAPI?.aider) {
                this.available = await window.electronAPI.aider.checkAvailability();
            }
        }
        catch (e) {
            console.warn('Aider CLI availability check failed', e);
            this.available = false;
        }
        return this.available;
    }
    async sendConversation(messages, options = {}) {
        if (!(await this.checkAvailability()))
            throw new Error('Aider CLI not available');
        const prompt = this.formatMessages(messages);
        const raw = await window.electronAPI.aider.execute(prompt, options);
        return { raw };
    }
    async runPrompt(prompt, options = {}) {
        if (!(await this.checkAvailability()))
            throw new Error('Aider CLI not available');
        const raw = await window.electronAPI.aider.execute(prompt, options);
        return { raw };
    }
    formatMessages(messages) {
        return messages.map(m => `${m.role.toUpperCase()}:\n${m.content || ''}`).join('\n\n');
    }
}
