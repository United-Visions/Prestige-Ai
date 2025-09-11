import { create } from 'zustand';

interface AIState {
  previewVisible: boolean;
  setPreviewVisible: (visible: boolean) => void;
  previewApp: any; // You might want to type this more strictly later
  setPreviewApp: (app: any) => void;
}

export const useAIStore = create<AIState>((set) => ({
  previewVisible: false,
  setPreviewVisible: (visible) => set({ previewVisible: visible }),
  previewApp: null,
  setPreviewApp: (app) => set({ previewApp: app }),
}));
