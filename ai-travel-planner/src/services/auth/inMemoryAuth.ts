import type { User } from '../../types';

/**
 * 本地“内存数据库” + 持久化（localStorage）认证实现
 * - usersByEmail: email -> User + password（仅本地演示，切勿用于生产）
 * - sessionsByToken: token -> { userId, expiresAt }
 * - 通过 localStorage 持久化用户与当前会话，保证刷新后仍可用
 */

type StoredUser = User & { password: string };

type Session = {
  token: string;
  userId: string;
  expiresAt: number; // ms timestamp
};

const LS_USERS_KEY = 'inmem-auth.users';
const LS_SESSION_KEY = 'inmem-auth.session';
const LS_AUTH_TOKEN_KEY = 'auth-token';

function nowMs() {
  return Date.now();
}

function genToken(): string {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

const DEFAULT_TTL_SECONDS = 7 * 24 * 3600; // 默认7天

class InMemoryAuth {
  private usersByEmail = new Map<string, StoredUser>();
  private sessionsByToken = new Map<string, Session>();
  private listeners = new Set<(user: User | null) => void>();
  private currentSession: Session | null = null;

  constructor() {
    this.hydrate();
    // 初次无用户则内置一个演示账号
    if (this.usersByEmail.size === 0) {
      const demo: StoredUser = {
        id: 'mock-user-id',
        email: 'demo@example.com',
        name: 'Demo User',
        avatar: '',
        created_at: new Date().toISOString(),
        password: 'demo123',
      };
      this.usersByEmail.set(demo.email, demo);
      this.persistUsers();
    }
  }

  private persistUsers() {
    const arr = Array.from(this.usersByEmail.values());
    localStorage.setItem(LS_USERS_KEY, JSON.stringify(arr));
  }

  private persistSession() {
    if (this.currentSession) {
      localStorage.setItem(LS_SESSION_KEY, JSON.stringify(this.currentSession));
      localStorage.setItem(LS_AUTH_TOKEN_KEY, this.currentSession.token);
    } else {
      localStorage.removeItem(LS_SESSION_KEY);
      localStorage.removeItem(LS_AUTH_TOKEN_KEY);
    }
  }

  private hydrate() {
    try {
      const usersRaw = localStorage.getItem(LS_USERS_KEY);
      if (usersRaw) {
        const arr: StoredUser[] = JSON.parse(usersRaw);
        arr.forEach(u => this.usersByEmail.set(u.email, u));
      }
      const sessionRaw = localStorage.getItem(LS_SESSION_KEY);
      if (sessionRaw) {
        const s: Session = JSON.parse(sessionRaw);
        if (s.expiresAt > nowMs()) {
          this.currentSession = s;
          this.sessionsByToken.set(s.token, s);
        } else {
          localStorage.removeItem(LS_SESSION_KEY);
          localStorage.removeItem(LS_AUTH_TOKEN_KEY);
        }
      }
    } catch {
      // 忽略损坏的本地数据
      localStorage.removeItem(LS_USERS_KEY);
      localStorage.removeItem(LS_SESSION_KEY);
      localStorage.removeItem(LS_AUTH_TOKEN_KEY);
    }
  }

  private emit(user: User | null) {
    this.listeners.forEach(fn => {
      try { fn(user); } catch { /* ignore */ }
    });
  }

  private setSessionForUser(userId: string, ttlSeconds = DEFAULT_TTL_SECONDS) {
    const token = genToken();
    const s: Session = {
      token,
      userId,
      expiresAt: nowMs() + ttlSeconds * 1000,
    };
    this.currentSession = s;
    this.sessionsByToken.set(token, s);
    this.persistSession();
    const user = this.userById(userId);
    this.emit(user);
    return s;
  }

  private userById(id: string): User | null {
    for (const u of this.usersByEmail.values()) {
      if (u.id === id) {
        // 剔除 password
        const { password, ...rest } = u;
        return rest as User;
      }
    }
    return null;
  }

  async login(email: string, password: string): Promise<{ user: User; token: string; expiresAt: number; }> {
    const u = this.usersByEmail.get(email);
    await this.simulateDelay(200);
    if (!u || u.password !== password) {
      throw new Error('邮箱或密码错误。演示账户: demo@example.com / demo123');
    }
    const session = this.setSessionForUser(u.id);
    const user = this.userById(u.id)!;
    return { user, token: session.token, expiresAt: session.expiresAt };
  }

  async register(email: string, password: string, metadata?: { name?: string }): Promise<{ user: User; token: string; expiresAt: number; }> {
    await this.simulateDelay(200);
    if (!email || password.length < 6) {
      throw new Error('请提供有效的邮箱和至少6位密码');
    }
    if (this.usersByEmail.has(email)) {
      throw new Error('该邮箱已被注册');
    }
    const id = `mock-user-${Date.now()}`;
    const stored: StoredUser = {
      id,
      email,
      name: metadata?.name || email.split('@')[0],
      avatar: '',
      created_at: new Date().toISOString(),
      password,
    };
    this.usersByEmail.set(email, stored);
    this.persistUsers();
    const session = this.setSessionForUser(id);
    const { password: _p, ...rest } = stored;
    return { user: rest as User, token: session.token, expiresAt: session.expiresAt };
  }

  async logout(): Promise<void> {
    await this.simulateDelay(100);
    if (this.currentSession) {
      this.sessionsByToken.delete(this.currentSession.token);
      this.currentSession = null;
      this.persistSession();
      this.emit(null);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    await this.simulateDelay(50);
    if (!this.currentSession) return null;
    const now = nowMs();
    if (this.currentSession.expiresAt <= now) {
      await this.logout();
      return null;
    }
    // 活跃续期：若剩余不足整体TTL的20%，自动延长回完整TTL
    const remaining = this.currentSession.expiresAt - now;
    const threshold = DEFAULT_TTL_SECONDS * 1000 * 0.2;
    if (remaining < threshold) {
      // 续期但不更换token（减少上层感知变化）
      const s = this.currentSession;
      const renewed: Session = { ...s, expiresAt: now + DEFAULT_TTL_SECONDS * 1000 };
      this.currentSession = renewed;
      this.sessionsByToken.set(renewed.token, renewed);
      this.persistSession();
    }
    return this.userById(this.currentSession.userId);
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    // 立即回调当前状态
    this.getCurrentUser().then(callback).catch(() => callback(null));
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  async resetPassword(_email: string) {
    // 本地实现为 no-op，仅模拟
    await this.simulateDelay(100);
  }

  async updateProfile(updates: { name?: string; avatar?: string }) {
    await this.simulateDelay(100);
    // 仅修改当前用户
    const cu = await this.getCurrentUser();
    if (!cu) return;
    const stored = this.usersByEmail.get(cu.email);
    if (!stored) return;
    const next: StoredUser = { ...stored, ...updates };
    this.usersByEmail.set(next.email, next);
    this.persistUsers();
    this.emit(this.userById(next.id));
  }

  private async simulateDelay(ms: number) {
    await new Promise(r => setTimeout(r, ms));
  }
}

export const inMemoryAuth = new InMemoryAuth();