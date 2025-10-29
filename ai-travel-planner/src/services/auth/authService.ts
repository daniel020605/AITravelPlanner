import type { User } from '../../types';
import { getSupabaseClient, getSupabaseAdminClient } from '../sync/supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';

function mapSupabaseUser(user: SupabaseUser | null): User | null {
  if (!user || !user.email) return null;
  const metadata = user.user_metadata || {};
  return {
    id: user.id,
    email: user.email,
    name: metadata.name || user.email.split('@')[0],
    avatar: metadata.avatar_url || metadata.avatar || '',
    created_at: user.created_at || new Date().toISOString(),
  };
}

async function confirmEmailIfPossible(email: string): Promise<boolean> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) return false;
  try {
    const { data, error } = await adminClient.auth.admin.getUserByEmail(email);
    if (error || !data?.user) {
      return false;
    }
    const target = data.user;
    const { error: updateError } = await adminClient.auth.admin.updateUserById(target.id, {
      email_confirm: true,
    });
    if (updateError) {
      console.error('Supabase email confirm failed:', updateError);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase email confirm failed:', err);
    return false;
  }
}

async function supabaseLogin(email: string, password: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const attemptSignIn = async () => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  let { data, error } = await attemptSignIn();
  if (error) {
    const message = error.message?.toLowerCase() || '';
    if (message.includes('email not confirmed')) {
      const confirmed = await confirmEmailIfPossible(email);
      if (confirmed) {
        const retry = await attemptSignIn();
        data = retry.data;
        error = retry.error;
      } else {
        throw new Error('Supabase 登录失败：该邮箱尚未确认。请在 Supabase 控制台关闭邮箱验证，或手动完成确认。');
      }
    }
    if (error) {
      throw new Error(error.message || '登录失败，请检查邮箱与密码');
    }
  }
  const session = data.session ?? null;
  const user = data.user ?? session?.user ?? null;
  const mapped = mapSupabaseUser(user);
  if (!mapped) {
    throw new Error('未能获取到用户信息');
  }
  return {
    user: mapped,
    session,
  };
}

async function supabaseRegister(email: string, password: string, metadata?: { name?: string }) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: metadata?.name || email.split('@')[0],
      },
    },
  });
  if (error) {
    throw new Error(error.message || '注册失败，请稍后再试');
  }
  let session = data.session ?? null;
  let user = data.user ?? session?.user ?? null;

  // 如果 Supabase 未返回 session，尝试立即登录以避免邮箱验证流程
  if (!session) {
    const confirmed = await confirmEmailIfPossible(email);
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!signInError) {
      session = signInData.session ?? null;
      user = signInData.user ?? session?.user ?? user;
    } else if (!confirmed) {
      throw new Error(
        signInError.message ||
          '注册成功，但未能自动登录。请在 Supabase 控制台关闭邮箱验证后重试。'
      );
    }
  }

  const mapped = mapSupabaseUser(user);
  if (!mapped) {
    throw new Error('注册成功，但未收到用户信息，请稍后重试');
  }
  return {
    user: mapped,
    session,
  };
}

async function supabaseLogout() {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message || '退出登录失败');
  }
  return true;
}

async function supabaseGetCurrentUser(): Promise<User | null | undefined> {
  const supabase = getSupabaseClient();
  if (!supabase) return undefined;
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error(error.message || '获取当前用户失败');
  }
  return mapSupabaseUser(data.user ?? null);
}

function supabaseOnAuthStateChange(callback: (user: User | null) => void) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = supabase.auth.onAuthStateChange((_event, session) => {
    const mapped = mapSupabaseUser(session?.user ?? null);
    callback(mapped);
  });
  if (error) {
    console.error('Supabase auth state subscription error:', error);
    return null;
  }
  return data.subscription;
}

async function supabaseResetPassword(email: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/login`,
  });
  if (error) {
    throw new Error(error.message || '重置密码请求发送失败');
  }
  return true;
}

async function supabaseUpdateProfile(updates: { name?: string; avatar?: string }) {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const { error, data } = await supabase.auth.updateUser({
    data: {
      name: updates.name,
      avatar_url: updates.avatar,
    },
  });
  if (error) {
    throw new Error(error.message || '更新个人信息失败');
  }
  return data;
}

/**
 * Supabase 认证服务封装
 * - 封装登录/注册/登出/获取当前用户/状态订阅/密码重置/资料更新
 * - 保持返回结构兼容（包含 session 字段），便于上层调用
 */
export const authService = {
  // 登录
  async login(email: string, password: string) {
    const supabaseResult = await supabaseLogin(email, password);
    if (supabaseResult) {
      return supabaseResult;
    }
    throw new Error('Supabase 未配置，无法完成登录');
  },

  // 注册
  async register(email: string, password: string, metadata?: { name?: string }) {
    const supabaseResult = await supabaseRegister(email, password, metadata);
    if (supabaseResult) {
      return supabaseResult;
    }
    throw new Error('Supabase 未配置，无法完成注册');
  },

  // 登出
  async logout() {
    const supabaseHandled = await supabaseLogout();
    if (!supabaseHandled) {
      throw new Error('Supabase 未配置，无法登出');
    }
  },

  // 获取当前用户
  async getCurrentUser(): Promise<User | null> {
    const maybeSupabaseUser = await supabaseGetCurrentUser();
    if (maybeSupabaseUser === undefined) {
      return null;
    }
    return maybeSupabaseUser;
  },

  // 监听认证状态变化（返回结构兼容原来 supabase 回调句柄）
  onAuthStateChange(callback: (user: User | null) => void) {
    const supabaseSubscription = supabaseOnAuthStateChange(callback);
    if (supabaseSubscription) {
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              Promise.resolve(supabaseSubscription.unsubscribe()).catch((err) => {
                console.error('Supabase unsubscribe failed:', err);
              });
            },
          },
        },
      };
    }
    return {
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    };
  },

  // 重置密码（本地 no-op，保留接口）
  async resetPassword(email: string) {
    const supabaseHandled = await supabaseResetPassword(email);
    if (!supabaseHandled) {
      throw new Error('Supabase 未配置，无法重置密码');
    }
  },

  // 更新用户信息
  async updateProfile(updates: { name?: string; avatar?: string }) {
    const supabaseHandled = await supabaseUpdateProfile(updates);
    if (!supabaseHandled) {
      throw new Error('Supabase 未配置，无法更新资料');
    }
  },
};
