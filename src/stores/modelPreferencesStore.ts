import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LargeLanguageModel } from '@/lib/models';

export interface ModelPreferences {
  defaultChatModel?: LargeLanguageModel;
  defaultFixModel?: LargeLanguageModel;
  useFixModelForChat?: boolean;
  useChatModelForFix?: boolean;
}

interface ModelPreferencesStore extends ModelPreferences {
  setDefaultChatModel: (model: LargeLanguageModel) => void;
  setDefaultFixModel: (model: LargeLanguageModel) => void;
  setUseFixModelForChat: (use: boolean) => void;
  setUseChatModelForFix: (use: boolean) => void;
  getModelForContext: (context: 'chat' | 'fix') => LargeLanguageModel | null;
  clearPreferences: () => void;
}

export const useModelPreferencesStore = create<ModelPreferencesStore>()(
  persist(
    (set, get) => ({
      // Initial state
      defaultChatModel: undefined,
      defaultFixModel: undefined,
      useFixModelForChat: false,
      useChatModelForFix: false,

      setDefaultChatModel: (model) => {
        set({ defaultChatModel: model });
      },

      setDefaultFixModel: (model) => {
        set({ defaultFixModel: model });
      },

      setUseFixModelForChat: (use) => {
        set({ useFixModelForChat: use });
      },

      setUseChatModelForFix: (use) => {
        set({ useChatModelForFix: use });
      },

      getModelForContext: (context) => {
        const state = get();
        
        if (context === 'chat') {
          // If useFixModelForChat is true and we have a fix model, use it
          if (state.useFixModelForChat && state.defaultFixModel) {
            return state.defaultFixModel;
          }
          // Otherwise use the chat model
          return state.defaultChatModel || null;
        } else if (context === 'fix') {
          // If useChatModelForFix is true and we have a chat model, use it
          if (state.useChatModelForFix && state.defaultChatModel) {
            return state.defaultChatModel;
          }
          // Otherwise use the fix model
          return state.defaultFixModel || null;
        }
        
        return null;
      },

      clearPreferences: () => {
        set({
          defaultChatModel: undefined,
          defaultFixModel: undefined,
          useFixModelForChat: false,
          useChatModelForFix: false,
        });
      },
    }),
    {
      name: 'model-preferences-store',
      partialize: (state) => ({
        defaultChatModel: state.defaultChatModel,
        defaultFixModel: state.defaultFixModel,
        useFixModelForChat: state.useFixModelForChat,
        useChatModelForFix: state.useChatModelForFix,
      }),
    }
  )
);