export const env = {
  // OpenAI
  openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',

  // 科大讯飞
  xunfeiAppId: import.meta.env.VITE_XUNFEI_APP_ID || '',
  xunfeiApiKey: import.meta.env.VITE_XUNFEI_API_KEY || '',
  xunfeiApiSecret: import.meta.env.VITE_XUNFEI_API_SECRET || '',

  // 高德地图
  amapKey: import.meta.env.VITE_AMAP_KEY || '',
};

// 可选校验：当前不强制任何必填项
export const validateEnv = () => {
  return true;
};