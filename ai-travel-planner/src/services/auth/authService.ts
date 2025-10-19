import type { User } from '../../types';
import { inMemoryAuth } from './inMemoryAuth';

/**
 * 纯本地认证服务（无 Supabase 依赖）
 * - 使用 inMemoryAuth 完成登录/注册/登出/获取当前用户/状态订阅/密码重置/资料更新
 * - 返回值结构与原有实现保持兼容（包含 session 字段），以避免上层调用改动
 */
export const authService = {
  // 登录
  async login(email: string, password: string) {
    const res = await inMemoryAuth.login(email, password);
    return {
      user: res.user,
      session: {
        access_token: res.token,
        refresh_token: 'inmem-refresh-token',
        expires_in: Math.max(1, Math.floor((res.expiresAt - Date.now()) / 1000)),
        token_type: 'bearer',
        user: res.user,
      },
    };
  },

  // 注册
  async register(email: string, password: string, metadata?: { name?: string }) {
    const res = await inMemoryAuth.register(email, password, metadata);
    return {
      user: res.user,
      session: {
        access_token: res.token,
        refresh_token: 'inmem-refresh-token',
        expires_in: Math.max(1, Math.floor((res.expiresAt - Date.now()) / 1000)),
        token_type: 'bearer',
        user: res.user,
      },
    };
  },

  // 登出
  async logout() {
    await inMemoryAuth.logout();
  },

  // 获取当前用户
  async getCurrentUser(): Promise<User | null> {
    return await inMemoryAuth.getCurrentUser();
  },

  // 监听认证状态变化（返回结构兼容原来 supabase 回调句柄）
  onAuthStateChange(callback: (user: User | null) => void) {
    const unsubscribe = inMemoryAuth.onAuthStateChange(callback);
    return {
      data: {
        subscription: {
          unsubscribe,
        },
      },
    };
  },

  // 重置密码（本地 no-op，保留接口）
  async resetPassword(email: string) {
    await inMemoryAuth.resetPassword(email);
  },

  // 更新用户信息
  async updateProfile(updates: { name?: string; avatar?: string }) {
    await inMemoryAuth.updateProfile(updates);
  },
};