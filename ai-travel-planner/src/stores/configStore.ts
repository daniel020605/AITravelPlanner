import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { APIConfig } from '../types/index';

interface ConfigState {
  config: Partial<APIConfig>;
  isLoading: boolean;
  error: string | null;

  updateConfig: (updates: Partial<APIConfig>) => void;
  validateConfig: () => boolean;
  resetConfig: () => void;
  clearError: () => void;
}

const defaultConfig: Partial<APIConfig> = {
  openai_base_url: '',
  openai_api_key: '',
  openai_model: '',
  xunfei_app_id: '',
  xunfei_api_key: '',
  xunfei_api_secret: '',
  amap_key: '',
  // 云端同步（Supabase）默认空配置
  supabase_url: '',
  supabase_anon_key: '',
  // Note: sync_api_base and sync_api_key are kept in the type for backward compatibility
  // but are no longer used as defaults since we prioritize Supabase
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      config: defaultConfig,
      isLoading: false,
      error: null,

      updateConfig: (updates) => {
        set(state => ({
          config: { ...state.config, ...updates }
        }));
      },

      validateConfig: () => {
        // 本地实现下无必填项，返回 true
        return true;
      },

      resetConfig: () => {
        set({ config: defaultConfig, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'config-storage',
    }
  )
);