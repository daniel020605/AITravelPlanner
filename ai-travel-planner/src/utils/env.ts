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

export const env = {
  // OpenAI
  openaiApiKey: runtimeValue('OPENAI_API_KEY') || viteValue('OPENAI_API_KEY'),

  // 科大讯飞
  xunfeiAppId: runtimeValue('XUNFEI_APP_ID') || viteValue('XUNFEI_APP_ID'),
  xunfeiApiKey: runtimeValue('XUNFEI_API_KEY') || viteValue('XUNFEI_API_KEY'),
  xunfeiApiSecret: runtimeValue('XUNFEI_API_SECRET') || viteValue('XUNFEI_API_SECRET'),

  // 高德地图
  amapKey: runtimeValue('AMAP_KEY') || viteValue('AMAP_KEY'),

  // Supabase
  supabaseUrl: runtimeValue('SUPABASE_URL') || viteValue('SUPABASE_URL'),
  supabaseAnonKey: runtimeValue('SUPABASE_ANON_KEY') || viteValue('SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey:
    runtimeValue('SUPABASE_SERVICE_ROLE_KEY') || viteValue('SUPABASE_SERVICE_ROLE_KEY'),
};

// 可选校验：当前不强制任何必填项
export const validateEnv = () => {
  return true;
};
