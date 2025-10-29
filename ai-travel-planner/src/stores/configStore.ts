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

const runtimeConfig =
  typeof window !== 'undefined' && (window as any).__APP_CONFIG__
    ? (window as any).__APP_CONFIG__
    : {};

const runtimeValue = (key: string): string => {
  const value = (runtimeConfig as Record<string, unknown>)[key];
  return typeof value === 'string' && value && !value.startsWith('$') ? value : '';
};

const viteValue = (key: string): string => {
  const value = (import.meta.env as Record<string, unknown>)[`VITE_${key}`];
  return typeof value === 'string' ? value : '';
};

const defaultConfig: Partial<APIConfig> = {
  openai_base_url: runtimeValue('OPENAI_BASE_URL') || viteValue('OPENAI_BASE_URL'),
  openai_api_key: runtimeValue('OPENAI_API_KEY') || viteValue('OPENAI_API_KEY'),
  openai_model: runtimeValue('OPENAI_MODEL') || viteValue('OPENAI_MODEL'),
  xunfei_app_id: runtimeValue('XUNFEI_APP_ID') || viteValue('XUNFEI_APP_ID'),
  xunfei_api_key: runtimeValue('XUNFEI_API_KEY') || viteValue('XUNFEI_API_KEY'),
  xunfei_api_secret: runtimeValue('XUNFEI_API_SECRET') || viteValue('XUNFEI_API_SECRET'),
  amap_key: runtimeValue('AMAP_KEY') || viteValue('AMAP_KEY'),
  // 云端同步（Supabase）默认取运行时配置
  supabase_url: runtimeValue('SUPABASE_URL') || viteValue('SUPABASE_URL'),
  supabase_anon_key: runtimeValue('SUPABASE_ANON_KEY') || viteValue('SUPABASE_ANON_KEY'),
  supabase_service_role_key:
    runtimeValue('SUPABASE_SERVICE_ROLE_KEY') || viteValue('SUPABASE_SERVICE_ROLE_KEY'),
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
