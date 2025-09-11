import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { FileNode } from '@/types';

interface CodeViewerState {
  isVisible: boolean;
  selectedFile: FileNode | null;
  isAnimating: boolean;
  activeTab: string;
  showFileTree: boolean;

  // Actions
  showCodeViewer: (file: FileNode) => void;
  showPreviewMode: () => void;
  hideCodeViewer: () => void;
  setSelectedFile: (file: FileNode | null) => void;
  setIsAnimating: (isAnimating: boolean) => void;
  setActiveTab: (tab: string) => void;
  setShowFileTree: (show: boolean) => void;
}

const useCodeViewerStore = create<CodeViewerState>()(
  devtools(
    (set) => ({
      // Initial state
      isVisible: false,
      selectedFile: null,
      isAnimating: false,
      activeTab: 'code',
      showFileTree: true,

      // Actions
      showCodeViewer: (file: FileNode) => {
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
          selectedFile: null,  // No specific file selected, show file tree
          isVisible: true,
          isAnimating: true,
          activeTab: 'code'    // Start with code tab
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

      setSelectedFile: (file: FileNode | null) => {
        set({ selectedFile: file });
      },

      setIsAnimating: (isAnimating: boolean) => {
        set({ isAnimating });
      },

      setActiveTab: (tab: string) => {
        set({ activeTab: tab });
      },

      setShowFileTree: (show: boolean) => {
        set({ showFileTree: show });
      },
    }),
    {
      name: 'code-viewer-store',
    }
  )
);

export default useCodeViewerStore;