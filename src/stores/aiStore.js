import { create } from 'zustand';
export const useAIStore = create((set) => ({
    previewVisible: false,
    setPreviewVisible: (visible) => set({ previewVisible: visible }),
    previewApp: null,
    setPreviewApp: (app) => set({ previewApp: app }),
}));
