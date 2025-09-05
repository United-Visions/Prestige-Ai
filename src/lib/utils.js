import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
export function generateId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
export function formatTimestamp(date) {
    if (!date) {
        const now = new Date();
        return now.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
}
export function sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9.-]/gi, '_');
}
export function createTempFileName(extension = '.txt') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `prestige-ai-${timestamp}-${random}${extension}`;
}
