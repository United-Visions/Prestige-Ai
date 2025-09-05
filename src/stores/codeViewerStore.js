import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
const useCodeViewerStore = create()(devtools((set) => ({
    // Initial state
    isVisible: false,
    selectedFile: null,
    isAnimating: false,
    activeTab: 'code',
    showFileTree: true,
    // Actions
    showCodeViewer: (file) => {
        set({
            selectedFile: file,
            isVisible: true,
            isAnimating: true,
            activeTab: 'code'
        });
        // Reset animation state after animation completes
        setTimeout(() => {
            set({ isAnimating: false });
        }, 300);
    },
    showPreviewMode: () => {
        set({
            selectedFile: null, // No specific file selected, show file tree
            isVisible: true,
            isAnimating: true,
            activeTab: 'code' // Start with code tab
        });
        // Reset animation state after animation completes
        setTimeout(() => {
            set({ isAnimating: false });
        }, 300);
    },
    hideCodeViewer: () => {
        set({ isAnimating: true });
        // Wait for slide down animation before hiding
        setTimeout(() => {
            set({
                isVisible: false,
                selectedFile: null,
                isAnimating: false
            });
        }, 300);
    },
    setSelectedFile: (file) => {
        set({ selectedFile: file });
    },
    setIsAnimating: (isAnimating) => {
        set({ isAnimating });
    },
    setActiveTab: (tab) => {
        set({ activeTab: tab });
    },
    setShowFileTree: (show) => {
        set({ showFileTree: show });
    },
}), {
    name: 'code-viewer-store',
}));
export default useCodeViewerStore;
