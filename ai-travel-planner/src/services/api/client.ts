import axios from 'axios';

// 创建基础HTTP客户端
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加认证token等
    const token = localStorage.getItem('auth-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const message = error.response?.data?.message || error.message || '请求失败';
    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  }
);

// 专门的AI API客户端
export const aiClient = axios.create({
  baseURL: 'https://api.openai.com/v1',
  timeout: 0,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 动态读取配置：优先使用设置页配置，其次使用环境变量，最后使用默认
import { useConfigStore } from '../../stores/configStore';

aiClient.interceptors.request.use((config) => {
  try {
    const cfg = useConfigStore.getState().config || {};
    const base = (cfg.openai_base_url && cfg.openai_base_url.trim()) || (import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1');
    const key = (cfg.openai_api_key && cfg.openai_api_key.trim()) || import.meta.env.VITE_OPENAI_API_KEY;

    config.baseURL = base;
    if (key) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${key}`;
    }
  } catch {
    // 忽略读取配置失败，使用默认
    const key = import.meta.env.VITE_OPENAI_API_KEY;
    if (key) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${key}`;
    }
  }
  return config;
});