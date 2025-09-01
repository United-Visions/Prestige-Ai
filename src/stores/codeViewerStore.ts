import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { FileNode } from '@/types';

interface CodeViewerState {
  isVisible: boolean;
  selectedFile: FileNode | null;
  isAnimating: boolean;
  activeTab: string;

  // Actions
  showCodeViewer: (file: FileNode) => void;
  showPreviewMode: () => void;
  hideCodeViewer: () => void;
  setSelectedFile: (file: FileNode | null) => void;
  setIsAnimating: (isAnimating: boolean) => void;
  setActiveTab: (tab: string) => void;
}

const useCodeViewerStore = create<CodeViewerState>()(
  devtools(
    (set) => ({
      // Initial state
      isVisible: false,
      selectedFile: null,
      isAnimating: false,
      activeTab: 'code',

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
          selectedFile: { 
            name: 'Preview', 
            path: 'preview', 
            type: 'file',
            content: ''
          } as FileNode, 
          isVisible: true,
          isAnimating: true,
          activeTab: 'preview'
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
    }),
    {
      name: 'code-viewer-store',
    }
  )
);

export default useCodeViewerStore;